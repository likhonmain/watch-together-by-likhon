/**
 * Watch Together by Likhon — Comprehensive Video Player Engine
 * Features: Smooth timeline scrub, buffer preview, speed sync, subtitle manager,
 * audio track selection, PC hotkeys, and mobile double-tap seek gestures.
 */

class VideoPlayer {
  constructor(syncEngine, subtitleManager) {
    this.sync = syncEngine;
    this.subtitles = subtitleManager;

    // Elements
    this.video = document.getElementById('main-video');
    this.videoWrapper = document.getElementById('video-wrapper');
    this.controlsOverlay = document.getElementById('controls-overlay');
    this.subtitleDisplay = document.getElementById('subtitle-text');

    // Controls
    this.playPauseBtn = document.getElementById('btn-play-pause');
    this.skipBackBtn = document.getElementById('btn-skip-back');
    this.skipForwardBtn = document.getElementById('btn-skip-forward');
    this.timeDisplay = document.getElementById('time-display');
    this.volumeBtn = document.getElementById('btn-volume');
    this.volumeSlider = document.getElementById('volume-slider');
    this.speedBtn = document.getElementById('btn-speed');
    this.speedMenu = document.getElementById('speed-menu');
    this.subtitlesBtn = document.getElementById('btn-subtitles');
    this.subtitlesMenu = document.getElementById('subtitles-menu');
    this.audioTracksBtn = document.getElementById('btn-audio');
    this.audioMenu = document.getElementById('audio-menu');
    this.fullscreenBtn = document.getElementById('btn-fullscreen');

    // Timeline
    this.timelineContainer = document.getElementById('timeline-container');
    this.timelineTrack = document.getElementById('timeline-track');
    this.timelineProgress = document.getElementById('timeline-progress');
    this.timelineBuffer = document.getElementById('timeline-buffer');
    this.timelineTooltip = document.getElementById('timeline-tooltip');

    // Indicators & Gestures
    this.centerIndicator = document.getElementById('center-gesture-indicator');
    this.tapZoneLeft = document.getElementById('tap-zone-left');
    this.tapZoneRight = document.getElementById('tap-zone-right');

    // State
    this.isDraggingTimeline = false;
    this.hideControlsTimeout = null;
    this.lastTapTimeLeft = 0;
    this.lastTapTimeRight = 0;

    this.init();
  }

  init() {
    if (!this.video) return;

    this._bindVideoEvents();
    this._bindControlEvents();
    this._bindTimelineEvents();
    this._bindKeyboardShortcuts();
    this._bindMobileGestures();
    this._bindSyncEvents();

    // Start subtitle rendering loop
    this._startSubtitleLoop();
  }

  /**
   * Load local media File (zero data usage, direct memory/disk reading)
   */
  loadLocalFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    this.video.src = url;
    this.video.load();

    console.log(`[Player] Loaded local file: ${file.name} (${(file.size / (1024*1024)).toFixed(1)} MB)`);

    // Broadcast file info to peer so they can match
    this.video.onloadedmetadata = () => {
      if (this.sync) {
        this.sync.sendFileInfo(file.name, file.size, this.video.duration);
      }
      this._detectAudioTracks();
    };
  }

  /**
   * Load direct URL stream
   */
  loadStreamUrl(url) {
    if (!url) return;
    this.video.src = url;
    this.video.load();
    console.log(`[Player] Loaded stream URL: ${url}`);

    this.video.onloadedmetadata = () => {
      this._detectAudioTracks();
    };
  }

  /* ------------------------------------------------------------------------
     Video Element Events
     ------------------------------------------------------------------------ */
  _bindVideoEvents() {
    this.video.addEventListener('timeupdate', () => {
      this._updateProgress();
    });

    this.video.addEventListener('progress', () => {
      this._updateBuffer();
    });

    this.video.addEventListener('play', () => {
      this._updatePlayButton(true);
      if (this.sync && !this.sync.isRemoteUpdate) {
        this.sync.sendPlay(this.video.currentTime, this.video.playbackRate);
      }
    });

    this.video.addEventListener('pause', () => {
      this._updatePlayButton(false);
      if (this.sync && !this.sync.isRemoteUpdate) {
        this.sync.sendPause(this.video.currentTime);
      }
    });

    this.video.addEventListener('seeking', () => {
      if (this.sync && !this.sync.isRemoteUpdate) {
        this.sync.sendSeek(this.video.currentTime);
      }
    });

    this.video.addEventListener('ratechange', () => {
      this._updateSpeedUI();
      if (this.sync && !this.sync.isRemoteUpdate) {
        this.sync.sendRate(this.video.playbackRate);
      }
    });

    this.video.addEventListener('loadedmetadata', () => {
      this._updateTimeDisplay();
      this._detectAudioTracks();
    });

    // Error handling with friendly message
    this.video.addEventListener('error', (e) => {
      console.error('[Player] Video element error:', this.video.error);
      const err = this.video.error;
      let msg = 'Could not play this video file.';
      if (err) {
        if (err.code === 4) {
          msg = 'Format or Codec not supported by this browser. (Note: HEVC/MKV without AAC audio requires desktop PotPlayer).';
        }
      }
      const banner = document.getElementById('format-warning-banner');
      if (banner) {
        banner.style.display = 'block';
        banner.innerText = msg;
      }
    });
  }

  /* ------------------------------------------------------------------------
     Controls Events (Play/Pause, Skip, Volume, Menus)
     ------------------------------------------------------------------------ */
  _bindControlEvents() {
    // Play / Pause Toggle
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', () => this.togglePlay());
    }

    // Skip Back (-10s)
    if (this.skipBackBtn) {
      this.skipBackBtn.addEventListener('click', () => this.seekDelta(-10));
    }

    // Skip Forward (+10s)
    if (this.skipForwardBtn) {
      this.skipForwardBtn.addEventListener('click', () => this.seekDelta(10));
    }

    // Volume & Mute
    if (this.volumeBtn) {
      this.volumeBtn.addEventListener('click', () => this.toggleMute());
    }
    if (this.volumeSlider) {
      this.volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.video.volume = val;
        this.video.muted = (val === 0);
        this._updateVolumeIcon();
      });
    }

    // Playback Speed Menu
    if (this.speedBtn && this.speedMenu) {
      this.speedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleMenu(this.speedMenu);
      });

      this.speedMenu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
          const speed = parseFloat(e.currentTarget.getAttribute('data-speed'));
          this.setPlaybackSpeed(speed);
          this._closeAllMenus();
        });
      });
    }

    // Subtitles Menu
    if (this.subtitlesBtn && this.subtitlesMenu) {
      this.subtitlesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleMenu(this.subtitlesMenu);
      });

      // Subtitle offset buttons
      const delayMinusBtn = document.getElementById('sub-delay-minus');
      const delayPlusBtn = document.getElementById('sub-delay-plus');
      const delayResetBtn = document.getElementById('sub-delay-reset');
      const offsetDisplay = document.getElementById('sub-offset-display');

      if (delayMinusBtn) {
        delayMinusBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const offset = this.subtitles.adjustOffset(-250);
          if (offsetDisplay) offsetDisplay.innerText = `${offset > 0 ? '+' : ''}${offset}ms`;
        });
      }
      if (delayPlusBtn) {
        delayPlusBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const offset = this.subtitles.adjustOffset(250);
          if (offsetDisplay) offsetDisplay.innerText = `${offset > 0 ? '+' : ''}${offset}ms`;
        });
      }
      if (delayResetBtn) {
        delayResetBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const offset = this.subtitles.resetOffset();
          if (offsetDisplay) offsetDisplay.innerText = `0ms`;
        });
      }

      // Subtitle toggle (CC on/off)
      const subToggleBtn = document.getElementById('sub-toggle');
      if (subToggleBtn) {
        subToggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.subtitles.enabled = !this.subtitles.enabled;
          subToggleBtn.innerText = this.subtitles.enabled ? 'Subtitles: ON' : 'Subtitles: OFF';
          if (!this.subtitles.enabled && this.subtitleDisplay) {
            this.subtitleDisplay.innerText = '';
          }
        });
      }
    }

    // Audio Track Menu
    if (this.audioTracksBtn && this.audioMenu) {
      this.audioTracksBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleMenu(this.audioMenu);
      });
    }

    // Fullscreen Toggle
    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    // Close menus when clicking outside
    document.addEventListener('click', () => {
      this._closeAllMenus();
    });

    // Auto-hide controls after inactivity
    this._setupControlsAutoHide();
  }

  /* ------------------------------------------------------------------------
     Timeline & Smooth Scrubbing
     ------------------------------------------------------------------------ */
  _bindTimelineEvents() {
    if (!this.timelineContainer) return;

    const handleSeek = (e) => {
      const rect = this.timelineTrack.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetTime = pos * this.video.duration;

      if (!isNaN(targetTime)) {
        this.video.currentTime = targetTime;
        this._updateProgress();
      }
    };

    this.timelineContainer.addEventListener('mousedown', (e) => {
      this.isDraggingTimeline = true;
      this.timelineContainer.classList.add('dragging');
      handleSeek(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDraggingTimeline) {
        handleSeek(e);
      }

      // Tooltip preview time
      if (this.timelineContainer && this.video.duration) {
        const rect = this.timelineTrack.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right) {
          const hoverPos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const hoverTime = hoverPos * this.video.duration;
          this.timelineTooltip.innerText = this._formatTime(hoverTime);
          this.timelineTooltip.style.left = `${hoverPos * 100}%`;
        }
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.isDraggingTimeline) {
        this.isDraggingTimeline = false;
        this.timelineContainer.classList.remove('dragging');
      }
    });

    // Touch support for mobile scrubbing
    this.timelineContainer.addEventListener('touchstart', (e) => {
      this.isDraggingTimeline = true;
      this.timelineContainer.classList.add('dragging');
      const touch = e.touches[0];
      handleSeek(touch);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (this.isDraggingTimeline) {
        const touch = e.touches[0];
        handleSeek(touch);
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      if (this.isDraggingTimeline) {
        this.isDraggingTimeline = false;
        this.timelineContainer.classList.remove('dragging');
      }
    });
  }

  _updateProgress() {
    if (!this.video.duration) return;
    const pct = (this.video.currentTime / this.video.duration) * 100;
    if (this.timelineProgress) {
      this.timelineProgress.style.width = `${pct}%`;
    }
    this._updateTimeDisplay();
  }

  _updateBuffer() {
    if (!this.video.duration || this.video.buffered.length === 0) return;
    const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
    const pct = (bufferedEnd / this.video.duration) * 100;
    if (this.timelineBuffer) {
      this.timelineBuffer.style.width = `${pct}%`;
    }
  }

  _updateTimeDisplay() {
    if (!this.timeDisplay) return;
    const cur = this._formatTime(this.video.currentTime || 0);
    const dur = this._formatTime(this.video.duration || 0);
    this.timeDisplay.innerHTML = `<span class="time-current">${cur}</span> / ${dur}`;
  }

  _formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const s = Math.floor(seconds);
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;

    const pad = (n) => String(n).padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  /* ------------------------------------------------------------------------
     PC Keyboard Shortcuts
     ------------------------------------------------------------------------ */
  _bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      // Don't trigger if user is typing in chat or text input
      const tag = e.target.tagName.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) {
        return;
      }

      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          this.togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          this.seekDelta(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          this.seekDelta(5);
          break;
        case 'KeyJ':
          e.preventDefault();
          this.seekDelta(-10);
          break;
        case 'KeyL':
          e.preventDefault();
          this.seekDelta(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          this.adjustVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          this.adjustVolume(-0.1);
          break;
        case 'KeyM':
          e.preventDefault();
          this.toggleMute();
          break;
        case 'KeyF':
          e.preventDefault();
          this.toggleFullscreen();
          break;
        case 'KeyC':
          e.preventDefault();
          if (this.subtitles) {
            this.subtitles.enabled = !this.subtitles.enabled;
            this._showGestureAnimation(this.subtitles.enabled ? 'CC On' : 'CC Off');
          }
          break;
        case 'Period':
          if (e.shiftKey) { // '>' key
            this.cycleSpeed(1);
          }
          break;
        case 'Comma':
          if (e.shiftKey) { // '<' key
            this.cycleSpeed(-1);
          }
          break;
      }
    });
  }

  /* ------------------------------------------------------------------------
     Mobile Touch Gestures (Double-tap left -10s, right +10s, single tap UI)
     ------------------------------------------------------------------------ */
  _bindMobileGestures() {
    if (this.tapZoneLeft) {
      this.tapZoneLeft.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - this.lastTapTimeLeft < 300) {
          // Double tap detected on left
          e.preventDefault();
          this.seekDelta(-10);
          this._triggerRipple(this.tapZoneLeft, '-10s');
          this.lastTapTimeLeft = 0;
        } else {
          this.lastTapTimeLeft = now;
          this._toggleControlsVisibility();
        }
      });
    }

    if (this.tapZoneRight) {
      this.tapZoneRight.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - this.lastTapTimeRight < 300) {
          // Double tap detected on right
          e.preventDefault();
          this.seekDelta(10);
          this._triggerRipple(this.tapZoneRight, '+10s');
          this.lastTapTimeRight = 0;
        } else {
          this.lastTapTimeRight = now;
          this._toggleControlsVisibility();
        }
      });
    }

    // Video click toggles play or controls on desktop
    this.video.addEventListener('click', () => {
      this.togglePlay();
    });
  }

  _triggerRipple(container, text) {
    let ripple = container.querySelector('.tap-ripple');
    if (!ripple) {
      ripple = document.createElement('div');
      ripple.className = 'tap-ripple';
      container.appendChild(ripple);
    }
    ripple.innerText = text;
    ripple.classList.add('active');
    setTimeout(() => {
      ripple.classList.remove('active');
    }, 400);
  }

  /* ------------------------------------------------------------------------
     Sync Engine Event Handlers
     ------------------------------------------------------------------------ */
  _bindSyncEvents() {
    if (!this.sync) return;

    this.sync.onActionReceived = (action) => {
      switch (action.type) {
        case 'play':
          this.video.currentTime = action.time;
          if (action.rate) this.video.playbackRate = action.rate;
          this.video.play().catch(e => console.warn('Autoplay blocked:', e));
          this._showGestureAnimation('Play (Synced)');
          break;

        case 'pause':
          this.video.currentTime = action.time;
          this.video.pause();
          this._showGestureAnimation('Pause (Synced)');
          break;

        case 'seek':
          this.video.currentTime = action.time;
          this._showGestureAnimation(`Seek: ${this._formatTime(action.time)}`);
          break;

        case 'rate':
          this.video.playbackRate = action.rate;
          this._updateSpeedUI();
          this._showGestureAnimation(`Speed: ${action.rate}x`);
          break;

        case 'heartbeat':
          // Drift correction: if client drifts by > 0.6s, correct smoothly
          const drift = Math.abs(this.video.currentTime - action.time);
          if (drift > 0.6) {
            console.log(`[Sync] Drift of ${drift.toFixed(2)}s detected. Adjusting to ${action.time.toFixed(2)}s`);
            this.video.currentTime = action.time;
          }
          if (action.isPlaying && this.video.paused) {
            this.video.play().catch(() => {});
          } else if (!action.isPlaying && !this.video.paused) {
            this.video.pause();
          }
          if (action.rate && this.video.playbackRate !== action.rate) {
            this.video.playbackRate = action.rate;
            this._updateSpeedUI();
          }
          break;
      }
    };
  }

  /* ------------------------------------------------------------------------
     Player Core Actions
     ------------------------------------------------------------------------ */
  togglePlay() {
    if (this.video.paused) {
      this.video.play();
      this._showGestureAnimation('Play');
    } else {
      this.video.pause();
      this._showGestureAnimation('Pause');
    }
  }

  seekDelta(seconds) {
    if (!this.video.duration) return;
    this.video.currentTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + seconds));
    this._showGestureAnimation(`${seconds > 0 ? '+' : ''}${seconds}s`);
  }

  setPlaybackSpeed(speed) {
    this.video.playbackRate = speed;
    this._updateSpeedUI();
    this._showGestureAnimation(`${speed}x`);
  }

  cycleSpeed(direction) {
    const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
    let idx = speeds.indexOf(this.video.playbackRate);
    if (idx === -1) idx = 2; // default 1.0
    idx = Math.max(0, Math.min(speeds.length - 1, idx + direction));
    this.setPlaybackSpeed(speeds[idx]);
  }

  adjustVolume(delta) {
    let newVol = Math.max(0, Math.min(1, this.video.volume + delta));
    this.video.volume = newVol;
    this.video.muted = (newVol === 0);
    if (this.volumeSlider) this.volumeSlider.value = newVol;
    this._updateVolumeIcon();
    this._showGestureAnimation(`Vol: ${Math.round(newVol * 100)}%`);
  }

  toggleMute() {
    this.video.muted = !this.video.muted;
    this._updateVolumeIcon();
    this._showGestureAnimation(this.video.muted ? 'Muted' : 'Unmuted');
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      if (this.videoWrapper.requestFullscreen) {
        this.videoWrapper.requestFullscreen();
      } else if (this.video.webkitEnterFullscreen) {
        this.video.webkitEnterFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  /* ------------------------------------------------------------------------
     Audio Track Selection
     ------------------------------------------------------------------------ */
  _detectAudioTracks() {
    if (!this.audioMenu) return;
    this.audioMenu.innerHTML = '<div class="menu-header">Audio Tracks</div>';

    // Check if HTML5 audioTracks API exists (e.g. Safari / experimental Chrome)
    if (this.video.audioTracks && this.video.audioTracks.length > 1) {
      for (let i = 0; i < this.video.audioTracks.length; i++) {
        const track = this.video.audioTracks[i];
        const btn = document.createElement('button');
        btn.className = `menu-item ${track.enabled ? 'active' : ''}`;
        btn.innerText = track.label || track.language || `Track ${i + 1}`;
        btn.addEventListener('click', () => {
          for (let j = 0; j < this.video.audioTracks.length; j++) {
            this.video.audioTracks[j].enabled = (j === i);
          }
          this._detectAudioTracks();
          this._closeAllMenus();
        });
        this.audioMenu.appendChild(btn);
      }
      if (this.audioTracksBtn) this.audioTracksBtn.style.display = 'flex';
    } else {
      // Single track or not exposed by browser
      const info = document.createElement('div');
      info.className = 'menu-item';
      info.innerText = 'Standard Audio (Default)';
      this.audioMenu.appendChild(info);
    }
  }

  /* ------------------------------------------------------------------------
     Subtitles Continuous Loop
     ------------------------------------------------------------------------ */
  _startSubtitleLoop() {
    const update = () => {
      if (this.subtitles && this.subtitleDisplay) {
        const text = this.subtitles.getCurrentText(this.video.currentTime);
        if (text !== this.subtitleDisplay.innerText) {
          this.subtitleDisplay.innerText = text;
          this.subtitleDisplay.style.display = text ? 'inline-block' : 'none';
        }
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  /* ------------------------------------------------------------------------
     UI State Helpers
     ------------------------------------------------------------------------ */
  _updatePlayButton(isPlaying) {
    if (!this.playPauseBtn) return;
    const playIcon = this.playPauseBtn.querySelector('.icon-play');
    const pauseIcon = this.playPauseBtn.querySelector('.icon-pause');
    if (playIcon && pauseIcon) {
      playIcon.style.display = isPlaying ? 'none' : 'block';
      pauseIcon.style.display = isPlaying ? 'block' : 'none';
    }
  }

  _updateSpeedUI() {
    if (this.speedBtn) {
      this.speedBtn.innerText = `${this.video.playbackRate}x`;
    }
    if (this.speedMenu) {
      this.speedMenu.querySelectorAll('.menu-item').forEach(item => {
        const sp = parseFloat(item.getAttribute('data-speed'));
        if (sp === this.video.playbackRate) {
          item.classList.add('active');
        } else {
          item.classList.remove('active');
        }
      });
    }
  }

  _updateVolumeIcon() {
    if (!this.volumeBtn) return;
    const isMuted = this.video.muted || this.video.volume === 0;
    const iconHigh = this.volumeBtn.querySelector('.icon-vol-high');
    const iconMute = this.volumeBtn.querySelector('.icon-vol-mute');
    if (iconHigh && iconMute) {
      iconHigh.style.display = isMuted ? 'none' : 'block';
      iconMute.style.display = isMuted ? 'block' : 'none';
    }
  }

  _showGestureAnimation(text) {
    if (!this.centerIndicator) return;
    this.centerIndicator.innerText = text;
    this.centerIndicator.classList.add('active');
    setTimeout(() => {
      this.centerIndicator.classList.remove('active');
    }, 500);
  }

  _setupControlsAutoHide() {
    const show = () => {
      if (this.controlsOverlay) this.controlsOverlay.classList.remove('hidden');
      if (this.videoWrapper) this.videoWrapper.style.cursor = 'default';
      clearTimeout(this.hideControlsTimeout);
      if (!this.video.paused) {
        this.hideControlsTimeout = setTimeout(() => {
          if (!this.isDraggingTimeline && !this._isAnyMenuOpen()) {
            if (this.controlsOverlay) this.controlsOverlay.classList.add('hidden');
            if (this.videoWrapper) this.videoWrapper.style.cursor = 'none';
          }
        }, 3500);
      }
    };

    if (this.videoWrapper) {
      this.videoWrapper.addEventListener('mousemove', show);
      this.videoWrapper.addEventListener('touchstart', show, { passive: true });
    }
  }

  _toggleControlsVisibility() {
    if (!this.controlsOverlay) return;
    if (this.controlsOverlay.classList.contains('hidden')) {
      this.controlsOverlay.classList.remove('hidden');
    } else {
      this.controlsOverlay.classList.add('hidden');
    }
  }

  _toggleMenu(menu) {
    const isShown = menu.classList.contains('show');
    this._closeAllMenus();
    if (!isShown) menu.classList.add('show');
  }

  _closeAllMenus() {
    document.querySelectorAll('.popup-menu').forEach(m => m.classList.remove('show'));
  }

  _isAnyMenuOpen() {
    return !!document.querySelector('.popup-menu.show');
  }
}

window.VideoPlayer = VideoPlayer;
