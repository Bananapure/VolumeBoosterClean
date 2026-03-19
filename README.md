# Volume Boost - Firefox / Zen Browser extension

A volume booster extension for Firefox and Zen Browser. Slider goes from 100% to 600%. One toggle to turn it on or off. That's it.

---

## Installing using .xpi (This extension has been submitted for review on the firefox extensions store. Once verified, it can be downloaded directly from there.)

1. Download as a ZIP
2. Rename it to .xpi
3. Go to about:config
4. Set xpinstall.signatures.required to FALSE using the toggle.
5. Drag the extension into the browser

---

## Why does this exist?

The volume booster I was using turned out to be malware.

It was silently rewriting affiliate links in my browser:- redirecting commission revenue to the extension author without me knowing. When I went looking for a replacement, everything else I tried had one of a few problems: too many permissions, broken on YouTube/Twitch, last updated in 2019, or just weirdly slow and ad-infested.

So I wrote this instead. It's about 150 lines of code across 4 files.

---

## Features

- Slider from 100% to 600%
- Toggle to enable/disable without touching the slider
- Volume setting persists across reloads (saved to local storage)
- Works on dynamically loaded media:- YouTube, Twitch, SoundCloud, etc. - via a MutationObserver watching for `<audio>` and `<video>` elements
- `DynamicsCompressorNode` in the audio chain — prevents clipping/distortion at high boost values
- Dark UI, nothing weird going on in the background
- Manifest V3

---


## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Send message to the active tab when you change the slider |
| `storage` | Remember your volume setting between sessions |
| `tabs` | Query the currently active tab |
| `scripting` | Inject content script into a tab if it didn't auto-load (MV3 replacement for `tabs.executeScript`) |
| `<all_urls>` (host) | Auto-inject on every page so it's already running when you hit play |

Nothing is collected, sent anywhere, or logged. Everything runs locally.

---

## Known limitations

**DRM content (Prime Video, Netflix, Spotify Web)** - these platforms use Encrypted Media Extensions, which the browser deliberately blocks from being routed through the Web Audio API. The boost won't apply. Audio may cut out entirely. This isn't fixable without a fundamentally different approach (`tabCapture`), which would make the extension significantly more complex.

---

## License

MIT.
