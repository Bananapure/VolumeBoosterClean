# Volume Boost — Firefox / Zen Browser extension

A volume booster extension for Firefox and Zen Browser. Slider goes from 100% to 600%. One toggle to turn it on or off. That's it.

---

## Why does this exist?

The volume booster I was using turned out to be malware.

It was silently rewriting affiliate links in my browser — redirecting commission revenue to the extension author without me knowing. When I went looking for a replacement, everything else I tried had one of a few problems: too many permissions, broken on YouTube/Twitch, last updated in 2019, or just weirdly slow and ad-infested.

So I wrote this instead. It's about 150 lines of code across 4 files.

---

## Features

- Slider from 100% to 600%
- Toggle to enable/disable without touching the slider
- Volume setting persists across reloads (saved to local storage)
- Works on dynamically loaded media — YouTube, Twitch, SoundCloud, etc. — via a MutationObserver watching for `<audio>` and `<video>` elements
- Dark UI, nothing weird going on in the background

---

## How it works

Uses the Web Audio API. The content script (`content.js`) intercepts `<audio>` and `<video>` elements on a page and routes them through a `GainNode`, which lets you push volume past the browser's usual 100% cap. The popup just sends a message to the content script with the new slider value whenever you change it.

Files:
- `content.js` — injected into every page, handles the actual audio graph
- `popup.html` / `popup.js` — the UI
- `manifest.json` — permissions

---

## Permissions

| Permission | Why |
|---|---|
| `activeTab` | Send message to the active tab when you change the slider |
| `storage` | Remember your volume setting between sessions |
| `tabs` | Fallback: inject the content script manually if it didn't auto-load |
| `<all_urls>` (host) | Auto-inject on every page so it's already running when you hit play |

Nothing is collected, sent anywhere, or logged. Everything runs locally.

---

## Known limitations

**DRM content (Prime Video, Netflix, Spotify Web)** — these platforms use Encrypted Media Extensions, which the browser deliberately blocks from being routed through the Web Audio API. The boost won't apply. Audio may cut out entirely. This isn't fixable without a fundamentally different approach (`tabCapture`), which would make the extension significantly more complex.

**Clipping at high boost** — pushing to 500–600% on already-loud content will distort. It's a raw gain amplifier, not a compressor. A `DynamicsCompressorNode` would fix this and is on the to-do list.

---

## Installing (dev mode)

1. Go to `about:debugging#/runtime/this-firefox` in Firefox or Zen
2. Click "Load Temporary Add-on..."
3. Select `manifest.json` from this folder
4. Done — icon appears in the toolbar

---

## Planned

- Migrate to Manifest V3
- Add `DynamicsCompressorNode` for clipping prevention
- Reduce host permission scope (inject on demand instead of all pages)
- Per-tab volume state

---

## License

MIT.
