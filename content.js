// Volume Boost - Content Script
// Uses Web Audio API to boost volume beyond 100%
// Includes a DynamicsCompressorNode (limiter) for clipping prevention.
// Includes an AnalyserNode that monitors raw source level to calculate
// the adaptive clip point and broadcast it to the popup.

let audioCtx = null;
let gainNode = null;
let compressorNode = null;
let analyserNode = null;
let connectedNodes = new Set();
let isEnabled = false;
let currentVolume = 100;

// Clip point tracking
let rollingPeak = 0;        // decaying max of raw source amplitude
let clipPoint = null;       // % gain at which raw signal would clip
let clipPollInterval = null;

function getOrCreateAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    gainNode = audioCtx.createGain();

    // Limiter — only engages near true clipping, transparent otherwise.
    compressorNode = audioCtx.createDynamicsCompressor();
    compressorNode.threshold.value = -3;    // dB — only kicks in near clipping
    compressorNode.knee.value       =  0;   // hard knee
    compressorNode.ratio.value      = 20;   // brick-wall
    compressorNode.attack.value     = 0.001;
    compressorNode.release.value    = 0.1;

    gainNode.connect(compressorNode);
    compressorNode.connect(audioCtx.destination);

    // AnalyserNode taps the raw pre-gain signal from each media source.
    // It is NOT in the main signal path — sources connect to it in parallel.
    analyserNode = audioCtx.createAnalyser();
    analyserNode.fftSize = 2048;
    // analyserNode intentionally has no downstream connection — it's monitoring-only.

    connectedNodes = new Set();
    rollingPeak = 0;
    clipPoint = null;

    startClipMonitor();
  }
  return { audioCtx, gainNode };
}

function connectMediaElement(el) {
  if (connectedNodes.has(el)) return;

  try {
    const { audioCtx, gainNode } = getOrCreateAudioContext();
    const source = audioCtx.createMediaElementSource(el);
    source.connect(gainNode);
    source.connect(analyserNode); // parallel tap — does not affect playback
    connectedNodes.add(el);

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  } catch (e) {
    // Element may already be connected to a different context — skip silently
  }
}

function applyBoost() {
  const { gainNode, audioCtx } = getOrCreateAudioContext();
  const gainValue = isEnabled ? currentVolume / 100 : 1;
  gainNode.gain.setTargetAtTime(gainValue, audioCtx.currentTime, 0.01);
  document.querySelectorAll('audio, video').forEach(connectMediaElement);
}

// --- Clip Point Monitor ---
// Polls the pre-gain analyser every 200 ms, tracks a slowly-decaying
// rolling peak, and derives & broadcasts the clip point to the popup.

function startClipMonitor() {
  if (clipPollInterval) return;

  const buffer = new Float32Array(2048);

  clipPollInterval = setInterval(() => {
    if (!analyserNode || connectedNodes.size === 0) return;

    analyserNode.getFloatTimeDomainData(buffer);

    // Find instantaneous peak amplitude
    let instantPeak = 0;
    for (let i = 0; i < buffer.length; i++) {
      const abs = Math.abs(buffer[i]);
      if (abs > instantPeak) instantPeak = abs;
    }

    // Decaying rolling max — decays ~50% over ~7 seconds (0.986^200ms ticks ≈ 3s half-life)
    rollingPeak = Math.max(instantPeak, rollingPeak * 0.986);

    if (rollingPeak < 0.005) {
      // Signal too quiet / silence — don't emit a clip point
      return;
    }

    // The clip point is the gain % at which the raw signal would reach full scale.
    // clip_gain_ratio = 1.0 / rollingPeak  →  as a percentage: * 100
    const newClipPoint = Math.min(1000, Math.round(100 / rollingPeak));

    if (newClipPoint !== clipPoint) {
      clipPoint = newClipPoint;
      browser.runtime.sendMessage({ type: 'CLIP_POINT', value: clipPoint })
        .catch(() => {}); // popup may not be open — silent fail
    }
  }, 200);
}

// Watch for new media elements added dynamically
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType !== 1) continue;
      if (node.matches('audio, video')) connectMediaElement(node);
      node.querySelectorAll && node.querySelectorAll('audio, video').forEach(connectMediaElement);
    }
  }
});

observer.observe(document.documentElement, { childList: true, subtree: true });

// Listen for messages from popup
browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'SET_BOOST') {
    isEnabled = msg.enabled;
    currentVolume = msg.volume;
    applyBoost();
  }
  if (msg.type === 'GET_STATE') {
    return Promise.resolve({ isEnabled, currentVolume, clipPoint });
  }
});

// Load saved state on inject
browser.storage.local.get(['enabled', 'volume']).then((data) => {
  isEnabled = data.enabled ?? false;
  currentVolume = data.volume ?? 150;
  applyBoost();
});
