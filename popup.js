const slider = document.getElementById('slider');
const volNum = document.getElementById('volNum');
const toggleBtn = document.getElementById('toggleBtn');
const btnLabel = document.getElementById('btnLabel');

let isEnabled = false;
let volume = 150;

function updateSliderFill() {
  const min = 100, max = 600;
  const pct = ((volume - min) / (max - min)) * 100;
  slider.style.setProperty('--fill', pct + '%');
}

function updateUI() {
  volNum.textContent = volume;
  volNum.classList.toggle('off', !isEnabled);
  slider.disabled = !isEnabled;
  toggleBtn.classList.toggle('active', isEnabled);
  btnLabel.textContent = isEnabled ? 'Boost ON — Click to Disable' : 'Enable Boost';
  updateSliderFill();
}

function sendToTab() {
  browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
    if (!tab) return;
    browser.tabs.sendMessage(tab.id, {
      type: 'SET_BOOST',
      enabled: isEnabled,
      volume: volume
    }).catch(() => {
      // Content script not yet loaded on this tab — inject it
      browser.tabs.executeScript(tab.id, { file: 'content.js' }).then(() => {
        browser.tabs.sendMessage(tab.id, {
          type: 'SET_BOOST',
          enabled: isEnabled,
          volume: volume
        });
      }).catch(() => {});
    });
  });
  browser.storage.local.set({ enabled: isEnabled, volume });
}

// Load saved state
browser.storage.local.get(['enabled', 'volume']).then((data) => {
  isEnabled = data.enabled ?? false;
  volume = data.volume ?? 150;
  slider.value = volume;
  updateUI();
});

// Slider input
slider.addEventListener('input', () => {
  volume = parseInt(slider.value);
  updateUI();
  sendToTab();
});

// Toggle button
toggleBtn.addEventListener('click', () => {
  isEnabled = !isEnabled;
  updateUI();
  sendToTab();
});
