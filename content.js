// Volume Boost - Content Script
// Uses Web Audio API to boost volume beyond 100%

let audioCtx = null;
let gainNode = null;
let connectedNodes = new Set();
let isEnabled = false;
let currentVolume = 100;

function getOrCreateAudioContext() {
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    gainNode = audioCtx.createGain();
    gainNode.connect(audioCtx.destination);
    connectedNodes = new Set();
  }
  return { audioCtx, gainNode };
}

function connectMediaElement(el) {
  if (connectedNodes.has(el)) return;

  try {
    const { audioCtx, gainNode } = getOrCreateAudioContext();
    const source = audioCtx.createMediaElementSource(el);
    source.connect(gainNode);
    connectedNodes.add(el);

    // Resume context if suspended (browser autoplay policy)
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

  // Connect all existing media elements
  document.querySelectorAll('audio, video').forEach(connectMediaElement);
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
    return Promise.resolve({ isEnabled, currentVolume });
  }
});

// Load saved state on inject
browser.storage.local.get(['enabled', 'volume']).then((data) => {
  isEnabled = data.enabled ?? false;
  currentVolume = data.volume ?? 150;
  applyBoost();
});
