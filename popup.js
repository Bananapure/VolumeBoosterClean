const slider    = document.getElementById('slider');
const volNum    = document.getElementById('volNum');
const toggleBtn = document.getElementById('toggleBtn');
const btnLabel  = document.getElementById('btnLabel');
const clipDot   = document.getElementById('clipDot');
const clipStatus = document.getElementById('clipStatus');

const SLIDER_MIN = 100;
const SLIDER_MAX = 1000;
const THUMB_PX   = 18; // thumb diameter in px (matches CSS)

let isEnabled = false;
let volume    = 150;
let clipPoint = null; // % value, or null if no signal detected yet

// ---------- UI helpers ----------

function updateSliderFill() {
  const pct = ((volume - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100;
  slider.style.setProperty('--fill', pct + '%');
}

function updateClipMarker() {
  if (clipPoint === null || clipPoint > SLIDER_MAX) {
    clipDot.style.display = 'none';
    clipStatus.textContent = '';
    clipStatus.className = 'clip-status';
    return;
  }

  // Position the dot over the slider track.
  // Standard formula: left = pct% + (0.5 - pct) * thumbPx
  // This corrects for the thumb's own width so the dot aligns with the thumb centre.
  const pct = (clipPoint - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN);
  const offsetPx = (0.5 - pct) * THUMB_PX;
  clipDot.style.display = 'block';
  clipDot.style.left = `calc(${pct * 100}% + ${offsetPx}px)`;

  // Status text
  const isOver = isEnabled && volume >= clipPoint;
  clipStatus.textContent = isOver
    ? '⚠ volume pushed above clip point'
    : '— volume under clip point';
  clipStatus.className = 'clip-status ' + (isOver ? 'over' : 'under');
}

function updateUI() {
  volNum.textContent = volume;
  volNum.classList.toggle('off', !isEnabled);
  slider.disabled = !isEnabled;
  toggleBtn.classList.toggle('active', isEnabled);
  btnLabel.textContent = isEnabled ? 'Boost ON — Click to Disable' : 'Enable Boost';
  updateSliderFill();
  updateClipMarker();
}

// ---------- Tab messaging ----------

function sendToTab() {
  browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (!tab) return;

    const msg = { type: 'SET_BOOST', enabled: isEnabled, volume };

    browser.tabs.sendMessage(tab.id, msg).catch(() => {
      browser.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      }).then(() => {
        browser.tabs.sendMessage(tab.id, msg).catch(() => {});
      }).catch(() => {});
    });
  });
  browser.storage.local.set({ enabled: isEnabled, volume });
}

// ---------- Initialise ----------

// Load saved state and request current clip point from content script
browser.storage.local.get(['enabled', 'volume']).then((data) => {
  isEnabled = data.enabled ?? false;
  volume    = data.volume  ?? 150;
  slider.value = volume;

  // Ask the content script for its current state (includes clipPoint)
  browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (!tab) { updateUI(); return; }
    browser.tabs.sendMessage(tab.id, { type: 'GET_STATE' })
      .then((state) => {
        if (state?.clipPoint !== undefined) clipPoint = state.clipPoint;
        updateUI();
      })
      .catch(() => updateUI()); // content script not loaded yet — that's fine
  });
});

// ---------- Live clip point updates from content script ----------

browser.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'CLIP_POINT') {
    clipPoint = msg.value;
    updateClipMarker();
  }
});

// ---------- Slider input ----------

slider.addEventListener('input', () => {
  volume = parseInt(slider.value);
  updateUI();
  sendToTab();
});

// ---------- Toggle button ----------

toggleBtn.addEventListener('click', () => {
  isEnabled = !isEnabled;
  updateUI();
  sendToTab();
});
