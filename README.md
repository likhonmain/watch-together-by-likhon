# 🎬 Watch Together by Likhon

A modern, high-performance, cross-platform movie synchronization suite designed to watch downloaded offline movies (or direct video links) together in real-time with **zero video streaming bandwidth**.

Engineered for **Windows PC** and **Android phones**, with **$0 hosting cost**.

---

## 🌟 Key Highlights

- **0 MB Streaming Bandwidth During Watching**: Both users select their downloaded local file. Video plays natively from device storage (SSD or phone storage) with pristine quality and zero buffering.
- **Cross-Platform**: Works smoothly on **Windows PC** and **Android** (via browser or "Add to Home Screen" PWA).
- **Ultra-Low Latency Sync (WebRTC via PeerJS)**: Play, Pause, Seek, and Playback Speed actions sync peer-to-peer in $<50\text{ms}$.
- **Built-in Peer-to-Peer Voice Call**: One-tap voice call with mic mute/unmute and live speech activity visualization.
- **Built-in Live Text Chat**: Slide-out drawer with audio notifications synthesized via the Web Audio API.
- **Full Media Player Controls**:
  - Smooth timeline scrubbing with time preview tooltips.
  - Synced playback speed ($0.5\times$, $0.75\times$, $1\times$, $1.25\times$, $1.5\times$, $2\times$).
  - Subtitle loader (`.srt` and `.vtt`) with on-the-fly $\pm 250\text{ms}$ delay offset adjustment.
  - Multi-track audio detection where supported by browser.
  - PC keyboard shortcuts & mobile double-tap seek gestures.
- **Bonus Windows Tool (`potplayer_sync.py`)**: For heavy 4K HDR HEVC 10-bit MKVs, a dedicated Windows tool connects directly to **Daum PotPlayer** to sync native desktop playback!

---

## 🚀 How to Run Locally

You can run Watch Together locally in 10 seconds without installing Node.js:

```powershell
# In this directory:
python -m http.server 8080
```

Now open:
- On your PC: `http://localhost:8080`
- On your Android phone (on same Wi-Fi): `http://<YOUR_PC_LOCAL_IP>:8080`

---

## ☁️ How to Deploy for 100% Free ($0 Forever)

You can host Watch Together for free so you and your friend can access it anywhere from cellular data or different Wi-Fi networks:

### Option A: Vercel (Recommended — Takes 1 Minute)
1. Go to [vercel.com](https://vercel.com) (free account).
2. Drag and drop this project folder into Vercel, or push to GitHub and import the repo.
3. Vercel will give you a free instant URL: `https://watch-together-likhon.vercel.app`.

### Option B: GitHub Pages
1. Push this folder to a GitHub repository.
2. In the repository settings $\rightarrow$ **Pages** $\rightarrow$ select `main` branch $\rightarrow$ click **Save**.
3. Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

---

## 🎮 Controls & Shortcuts

### Desktop Keyboard Shortcuts:
| Key | Action |
| :--- | :--- |
| `Space` / `K` | Play / Pause |
| `Left Arrow` / `Right Arrow` | Seek $\pm 5$ seconds |
| `J` / `L` | Seek $\pm 10$ seconds |
| `Up Arrow` / `Down Arrow` | Volume $\pm 10\%$ |
| `M` | Mute / Unmute |
| `F` | Fullscreen Toggle |
| `>` / `<` | Increase / Decrease Playback Speed |
| `C` | Toggle Subtitles On / Off |

### Mobile Touch Gestures (Android):
| Gesture | Action |
| :--- | :--- |
| **Double-tap Left side** | Seek backward $-10\text{s}$ with ripple animation |
| **Double-tap Right side** | Seek forward $+10\text{s}$ with ripple animation |
| **Single-tap Screen** | Toggle control overlay on / off |
| **Add to Home Screen** | Installs as a standalone full-screen app |

---

## 🖥️ Bonus Tool: Dedicated PotPlayer Synchronizer (`potplayer_sync.py`)

If you both watch on Windows PC and have heavy files like `Supergirl 2026 Dual ORG 4K HDR DV HEVC.mkv` (4K HDR Dolby Vision 10-bit HEVC):

1. Make sure PotPlayer is installed on both PCs.
2. Open the movie file in PotPlayer on both PCs.
3. Run the sync tool on both PCs:
   ```powershell
   python potplayer_sync.py
   ```
4. Host clicks **"Host Room"**, friend enters Host's IP and clicks **"Join Friend's Room"**.
5. When anyone presses Spacebar, pauses, or seeks in PotPlayer, both PotPlayers stay in millisecond lockstep!

---

## 📁 Project Structure

```
Watch_together/
├── index.html            # Main UI, player viewport, modals, chat drawer
├── manifest.json         # PWA configuration for Android standalone mode
├── sw.js                 # Service worker for offline asset caching
├── css/
│   └── style.css         # Cinema dark theme & mobile responsive design
├── js/
│   ├── peerjs.min.js     # Vendored WebRTC P2P signaling library
│   ├── srt-parser.js     # Subtitle parser (SRT/VTT) with delay offset sync
│   ├── sync.js           # WebRTC DataChannel synchronization engine
│   ├── voice.js          # WebRTC MediaStream voice chat & speech visualizer
│   ├── chat.js           # Live chat drawer with synthesized chime audio
│   ├── player.js         # Custom video player engine, timeline, hotkeys
│   └── app.js            # Main coordinator & UI event glue
├── potplayer_sync.py     # Standalone Windows synchronizer for Daum PotPlayer
└── README.md             # Complete documentation and deployment guide
```

---
*Crafted with precision by Likhon.*
