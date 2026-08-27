# 🎬 Watch Together by Likhon

> **Synchronized local movie streaming suite with 0 MB video data transfer, WebRTC peer-to-peer sync, YouTube Vanced swipe gestures, dual-audio dub switching, and live voice/chat.**

[![Live Web App](https://img.shields.io/badge/Live_Demo-GitHub_Pages-6366f1?style=for-the-badge&logo=github)](https://likhonmain.github.io/watch-together-by-likhon/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows_PC_|_Android-emerald?style=for-the-badge)](https://likhonmain.github.io/watch-together-by-likhon/)
[![Cost](https://img.shields.io/badge/Hosting_Cost-$0_Forever-gold?style=for-the-badge)](https://likhonmain.github.io/watch-together-by-likhon/)

---

## 📖 Overview

**Watch Together by Likhon** solves a major problem with modern co-watching apps: **buffering, quality degradation, and high data consumption**.

Instead of uploading and re-streaming gigabytes of heavy video through a central cloud server:
1. Both users keep their downloaded movie file (`.mkv`, `.mp4`, `.webm`) locally on their device (SSD or phone storage).
2. The browser plays the video natively from local disk at maximum quality (1080p/4K) with **0 MB video bandwidth consumed**.
3. A low-overhead WebRTC peer-to-peer connection (`< 50ms` latency) synchronizes **Play**, **Pause**, **Seek**, and **Playback Speed** in millisecond lockstep.

Designed and optimized specifically for **Windows PC Chrome** and **Android Mobile Browsers / PWA**.

---

## 🌟 Key Features

### 1. 0 MB Video Data Usage
* Video files are loaded via the HTML5 File API directly from local device storage.
* No video data is ever sent to or processed by a remote server.
* Ultra-fast scrubbing with zero buffering delays.

### 2. 3-Digit Room Codes & Instant Invite Links
* Connect with a clean, simple **3-digit room code** (e.g. `582`).
* Or click **Copy Invite Link** to share a direct link (e.g. `https://...?room=582`) that automatically connects your friend with one tap.
* Dual STUN/TURN fallback servers guarantee reliable NAT traversal across mobile cellular networks (4G/5G) and home Wi-Fi.

### 3. YouTube Vanced-Style Swipe Gestures (v3.9)
* **Left-Side Vertical Drag (Brightness)**:
  * Adjusts brightness from `0%` to `100%`.
  * **Non-Destructive Dimming Scrim**: Uses a dedicated `#virtual-brightness-scrim` overlay layer that preserves original contrast, color fidelity, and black levels without blowing out whites.
  * Shows a frosted-glass HUD with dynamic weather icons (`☀️` / `🌤️` / `🌙`), smooth vertical progress fill bar, and percentage.
* **Right-Side Vertical Drag (Volume)**:
  * Adjusts volume from `0%` to `100%`.
  * **Acoustic Logarithmic Curve**: Uses Stevens' acoustic power law ($\text{volume} = (\text{level}/100)^{2.2}$) to match human hearing perception. Eliminates the sudden 10% volume blast and makes volume glide smoothly to the human ear.
  * Shows a frosted-glass HUD with dynamic speaker icons (`🔇` / `🔉` / `🔊`), smooth vertical fill bar, and percentage.
* **Fullscreen Virtual Environment Isolation**:
  * Adjustments live in a temporary virtual session during fullscreen.
  * Exiting fullscreen automatically reverts brightness (transparent scrim) and volume (100% baseline) back to default device settings.
* **Continuous Frame Tracking & Dampening**:
  * Dragging is tracked frame-by-frame (`0.35%` change per pixel) for a tactile, silky-smooth gliding feel with zero jumps.

### 4. 5-Second Forward & Backward Skip
* **Mobile Double-Tap**:
  * Double-tap Left: Rewinds **5 seconds** with `-5s` animated ripple.
  * Double-tap Right: Fast-forwards **5 seconds** with `+5s` animated ripple.
* **Center On-Screen Controls**: Dedicated `[<< 5s]` and `[>> 5s]` quick skip buttons.
* **Player Bar & Hotkeys**: Bottom bar buttons and keyboard hotkeys (`Left`/`Right` and `J`/`L`) seek by exactly **5 seconds**.

### 5. Audio Track Selection & Multi-Dub Switcher
* **Dual-Audio Channel Router**:
  * Many downloaded dual-audio releases encode Language 1 (e.g. Hindi) on the Left channel and Language 2 (e.g. English) on the Right channel.
  * Features 1-tap channel routing powered by Web Audio API `ChannelSplitterNode` and `ChannelMergerNode`:
    * `[ 🎧 Stereo ]`: Standard stereo across both speakers/earphones.
    * `[ Left (Dub 1) ]`: Isolates the Left channel and routes it to **both** ears.
    * `[ Right (Dub 2) ]`: Isolates the Right channel and routes it to **both** ears.
* **Load External Dub Audio Track (`.mp3`, `.m4a`, `.aac`, `.wav`, `.ogg`)**:
  * Select an external dub file to play in lockstep with the video.
  * Automatically coordinates `play`, `pause`, `seek`, and `playbackRate`.
  * Includes an **Audio Sync Delay Offset** (`-250ms`, `+250ms`, `Reset`) to synchronize dialogue lips precisely.
* **Native Audio Tracks**:
  * Automatically detects and lists multiple embedded audio streams if exposed by the browser.

### 6. Synchronized Subtitles (.srt / .vtt)
* Load external subtitle files on either PC or mobile.
* On-the-fly **Delay Offset Adjustment** (`-250ms`, `+250ms`, `Reset`) with live millisecond badge display.
* Layered **above** the virtual brightness scrim, ensuring subtitles remain sharp, crisp, and readable even when the screen is dimmed for night viewing.

### 7. Multi-Tab Mobile Experience & Responsive Desktop UI
* **Mobile Bottom Panel (3 Dynamic Tabs)**:
  * **Tab 1: Live Chat (`💬`)**: Real-time synchronized chat stream, enter-to-send, unread message badges, and pleasant audio chimes.
  * **Tab 2: Audio & Subtitles (`🎛️`)**: Playback speed pills ($0.75\times$ to $2.0\times$), subtitle offset controls, dual-audio channel selector, and external dub track loader.
  * **Tab 3: Users in Room (`👥`)**: Connected room peers list, connection status badge, and an inline **Editable Display Name** with local storage persistence.
* **Desktop Layout**:
  * Cinema player layout with sticky modular sidebar cards:
    * Card 1: Room Connection, 3-Digit Code input, and Live User List.
    * Card 2: Movie File selector, Subtitle delay controls, and Dual-Audio Dub switcher.
    * Card 3: Real-time Live Chat stream with quick composer.

### 8. Built-in WebRTC Voice Chat
* 1-tap peer-to-peer voice calling directly through the browser.
* Microphone mute/unmute toggle.
* Real-time audio waveform activity indicator.

### 9. Progressive Web App (PWA) Support
* Installable as a standalone app on Android via **"Add to Home Screen"**.
* Launches in pure full-screen mode without browser address bars or navigation clutter.
* Offline asset caching via Service Worker.

### 10. Companion Desktop Tool: Daum PotPlayer Sync (`potplayer_sync.py`)
* For heavy desktop 4K HDR HEVC 10-bit Dolby Vision MKV movies that browsers cannot decode natively.
* Connects directly to **Daum PotPlayer** on Windows via Windows IPC messages to synchronize native playback in millisecond precision.

---

## 🎮 Controls & Shortcuts Reference

### Desktop Keyboard Shortcuts:
| Key | Action |
| :--- | :--- |
| `Space` / `K` | Play / Pause |
| `Left Arrow` / `Right Arrow` | Seek $\pm 5$ seconds |
| `J` / `L` | Seek $\pm 5$ seconds |
| `Up Arrow` / `Down Arrow` | Smooth Acoustic Volume $\pm 10\%$ (with Vanced HUD) |
| `M` | Mute / Unmute |
| `F` | Toggle Fullscreen |
| `>` / `<` (Shift + `.` / `,`) | Increase / Decrease Playback Speed |
| `C` | Toggle Subtitles On / Off |

### Mobile Touch Gestures (Android):
| Gesture | Action |
| :--- | :--- |
| **Swipe Up / Down on Left Half** | Smooth Video Brightness ($0\%$ to $100\%$) with Vanced HUD |
| **Swipe Up / Down on Right Half** | Smooth Acoustic Volume ($0\%$ to $100\%$) with Vanced HUD |
| **Double-tap Left Side** | Seek backward $-5\text{s}$ with ripple animation |
| **Double-tap Right Side** | Seek forward $+5\text{s}$ with ripple animation |
| **Single-tap Screen** | Toggle control overlay on / off |
| **Add to Home Screen** | Installs as a standalone full-screen Android app |

---

## 🚀 How to Run Locally

You can run Watch Together locally in 5 seconds with zero dependencies (no Node.js required):

```powershell
# Inside this project directory:
python -m http.server 8080
```

Open your browser:
* **On your PC**: `http://localhost:8080`
* **On your Android Phone (same Wi-Fi)**: `http://<YOUR_PC_IP>:8080`

---

## ☁️ Free Cloud Deployment ($0 Forever)

### Option A: GitHub Pages (Currently Live)
1. Push this repository to GitHub.
2. Navigate to **Settings** $\rightarrow$ **Pages**.
3. Under **Build and deployment**, select `Deploy from a branch` $\rightarrow$ `main` branch $\rightarrow$ `/ (root)`.
4. Your web app will be live at: `https://<your-username>.github.io/<repo-name>/`

### Option B: Vercel
1. Go to [vercel.com](https://vercel.com).
2. Import your GitHub repository.
3. Leave build settings as default (Static Site) and click **Deploy**.

---

## 🖥️ Companion Tool: PotPlayer Sync (`potplayer_sync.py`)

For high-bitrate 4K HDR HEVC 10-bit Dolby Vision files on Windows:

1. Install [Daum PotPlayer](https://potplayer.daum.net/) on both PCs.
2. Open the movie file in PotPlayer on both PCs.
3. Run the sync bridge:
   ```powershell
   python potplayer_sync.py
   ```
4. User A clicks **Host Room** (shares IP).
5. User B enters Host IP and clicks **Join Friend's Room**.
6. Play, pause, and seek commands in PotPlayer stay synchronized peer-to-peer!

---

## 📁 Project Structure

```
Watch_together/
├── index.html            # Core semantic markup, player viewport, HUDs, modular panels
├── manifest.json         # PWA configuration for Android standalone installation
├── sw.js                 # Service worker for offline asset caching
├── css/
│   └── style.css         # Modern cinema dark theme, Vanced HUD styles, responsive layouts
├── js/
│   ├── peerjs.min.js     # Vendored WebRTC P2P signaling library
│   ├── srt-parser.js     # Client-side subtitle parser (SRT/VTT) with delay offset sync
│   ├── sync.js           # WebRTC DataChannel synchronization engine (playback, seek, speed)
│   ├── voice.js          # WebRTC MediaStream voice chat & speech activity visualizer
│   ├── chat.js           # Live synchronized text chat with synthesized audio chimes
│   ├── player.js         # Custom video player engine, Vanced gestures, Web Audio router, hotkeys
│   └── app.js            # Main coordinator, tab switcher, room code logic & UI glue
├── potplayer_sync.py     # Standalone Windows synchronizer for Daum PotPlayer
└── README.md             # Project documentation and architecture guide
```

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).

---
*Crafted with precision by Likhon.*
