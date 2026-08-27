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
    this.centerPlayOverlay = document.getElementById('center-play-overlay');
    this.btnGiantPlay = document.getElementById('btn-giant-play');
    this.emptyPlayerPrompt = document.getElementById('empty-player-prompt');

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

    // Mobile Center Controls
    this.mccContainer = document.getElementById('mobile-center-controls');
    this.mccPlayPause = document.getElementById('mcc-play-pause');
    this.mccSkipBack = document.getElementById('mcc-skip-back');
    this.mccSkipForward = document.getElementById('mcc-skip-forward');

    // State
    this.isDraggingTimeline = false;
    this.hideControlsTimeout = null;
    this.lastTapTimeLeft = 0;
    this.lastTapTimeRight = 0;
    this.hasMediaLoaded = false;

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

    if (this.btnGiantPlay) {
      this.btnGiantPlay.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePlay();
      });
    }

    if (this.centerPlayOverlay) {
      this.centerPlayOverlay.addEventListener('click', () => {
        this.togglePlay();
      });
    }

    // Wire Mobile Center Controls
    if (this.mccPlayPause) {
      this.mccPlayPause.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePlay();
      });
    }
    if (this.mccSkipBack) {
      this.mccSkipBack.addEventListener('click', (e) => {
        e.stopPropagation();
        this.seekDelta(-10);
      });
    }
    if (this.mccSkipForward) {
      this.mccSkipForward.addEventListener('click', (e) => {
        e.stopPropagation();
        this.seekDelta(10);
      });
    }

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
    this.video.pause();
    this.video.currentTime = 0;
    this.video.load();
    this.video.pause();
    this.hasMediaLoaded = true;

    console.log(`[Player] Loaded local file: ${file.name} (${(file.size / (1024*1024)).toFixed(1)} MB)`);

    // Hide empty prompt & show center play button
    if (this.emptyPlayerPrompt) this.emptyPlayerPrompt.style.display = 'none';
    this._showCenterPlayCard(file.name);

    this.video.onloadedmetadata = () => {
      this.video.pause();
      this._updatePlayButton(false);
      this._updateProgress();
      this._updateTimeDisplay();
      this._showCenterPlayCard(file.name);

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
    this.video.pause();
    this.video.currentTime = 0;
    this.video.load();
    this.video.pause();
    this.hasMediaLoaded = true;
    console.log(`[Player] Loaded stream URL: ${url}`);

    if (this.emptyPlayerPrompt) this.emptyPlayerPrompt.style.display = 'none';
    const streamName = url.split('/').pop().split('?')[0] || 'Stream Video';
    this._showCenterPlayCard(streamName);

    this.video.onloadedmetadata = () => {
      this.video.pause();
      this._updatePlayButton(false);
      this._updateProgress();
      this._updateTimeDisplay();
      this._showCenterPlayCard(streamName);
      this._detectAudioTracks();
    };
  }

  _showCenterPlayCard(title = '') {
    if (!this.centerPlayOverlay) return;
    const titleEl = document.getElementById('center-movie-title');
    const durStr = this.video.duration ? ` (${this._formatTime(this.video.duration)})` : '';
    if (titleEl) {
      titleEl.innerText = title ? `▶ ${title}${durStr}` : 'Start Watching';
    }
    this.centerPlayOverlay.classList.remove('hidden');
    this.centerPlayOverlay.style.display = 'flex';
  }

  _hideCenterPlayCard() {
    if (!this.centerPlayOverlay) return;
    this.centerPlayOverlay.classList.add('hidden');
    this.centerPlayOverlay.style.display = 'none';
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
      this._hideCenterPlayCard();
      this._setupControlsAutoHide();
      if (this.sync && !this.sync.isRemoteUpdate) {
        this.sync.sendPlay(this.video.currentTime, this.video.playbackRate);
      }
    });

    this.video.addEventListener('pause', () => {
      this._updatePlayButton(false);
      // When paused, NEVER hide controls!
      if (this.controlsOverlay) this.controlsOverlay.classList.remove('hidden');
      if (this.hasMediaLoaded) {
        this._showCenterPlayCard();
      }
      clearTimeout(this.hideControlsTimeout);

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
      let msg = 'Could not play this video file in browser.';
      if (err && err.code === 4) {
        msg = 'Note: MKV/HEVC with AC3 audio is not natively supported in mobile browsers. Use MP4 with AAC, or run the included potplayer_sync.py on PC!';
      }
      const banner = document.getElementById('format-warning-banner');
      if (banner) {
        banner.style.display = 'block';
        banner.style.background = 'rgba(239, 68, 68, 0.95)';
        banner.innerText = msg;
      }
    });
  }

  /* ------------------------------------------------------------------------
     Controls Events (Play/Pause, Skip, Volume, Menus)
     ------------------------------------------------------------------------ */
  _bindControlEvents() {
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', () => this.togglePlay());
    }

    if (this.skipBackBtn) {
      this.skipBackBtn.addEventListener('click', () => this.seekDelta(-10));
    }

    if (this.skipForwardBtn) {
      this.skipForwardBtn.addEventListener('click', () => this.seekDelta(10));
    }

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

    if (this.subtitlesBtn && this.subtitlesMenu) {
      this.subtitlesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleMenu(this.subtitlesMenu);
      });

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

    if (this.audioTracksBtn && this.audioMenu) {
      this.audioTracksBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._toggleMenu(this.audioMenu);
      });
    }

    if (this.fullscreenBtn) {
      this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
    }

    document.addEventListener('click', () => {
      this._closeAllMenus();
    });

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
          if (e.shiftKey) {
            this.cycleSpeed(1);
          }
          break;
        case 'Comma':
          if (e.shiftKey) {
            this.cycleSpeed(-1);
          }
          break;
      }
    });
  }

  /* ------------------------------------------------------------------------
     Mobile Touch Gestures
     ------------------------------------------------------------------------ */
  _bindMobileGestures() {
    if (this.tapZoneLeft) {
      this.tapZoneLeft.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - this.lastTapTimeLeft < 300) {
          e.preventDefault();
          this.seekDelta(-10);
          this._triggerRipple(this.tapZoneLeft, '-10s');
          this.lastTapTimeLeft = 0;
        } else {
          this.lastTapTimeLeft = now;
          this._handleScreenTap();
        }
      });
    }

    if (this.tapZoneRight) {
      this.tapZoneRight.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - this.lastTapTimeRight < 300) {
          e.preventDefault();
          this.seekDelta(10);
          this._triggerRipple(this.tapZoneRight, '+10s');
          this.lastTapTimeRight = 0;
        } else {
          this.lastTapTimeRight = now;
          this._handleScreenTap();
        }
      });
    }

    this.video.addEventListener('click', () => {
      if (this.video.paused) {
        this.togglePlay();
      } else {
        this._handleScreenTap();
      }
    });
  }

  _handleScreenTap() {
    if (this.video.paused) {
      if (this.controlsOverlay) this.controlsOverlay.classList.remove('hidden');
      if (this.mccContainer) this.mccContainer.classList.remove('hidden');
      return;
    }
    const isHidden = this.controlsOverlay && this.controlsOverlay.classList.contains('hidden');
    if (isHidden) {
      if (this.controlsOverlay) this.controlsOverlay.classList.remove('hidden');
      if (this.mccContainer) this.mccContainer.classList.remove('hidden');
      this._setupControlsAutoHide();
    } else {
      if (this.controlsOverlay) this.controlsOverlay.classList.add('hidden');
      if (this.mccContainer) this.mccContainer.classList.add('hidden');
    }
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
          this._hideCenterPlayCard();
          break;

        case 'pause':
          this.video.currentTime = action.time;
          this.video.pause();
          this._showGestureAnimation('Pause (Synced)');
          this._showCenterPlayCard();
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
          const drift = Math.abs(this.video.currentTime - action.time);
          if (drift > 0.6) {
            console.log(`[Sync] Drift of ${drift.toFixed(2)}s detected. Adjusting to ${action.time.toFixed(2)}s`);
            this.video.currentTime = action.time;
          }
          if (action.isPlaying && this.video.paused) {
            this.video.play().catch(() => {});
            this._hideCenterPlayCard();
          } else if (!action.isPlaying && !this.video.paused) {
            this.video.pause();
            this._showCenterPlayCard();
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
      this.video.play().then(() => {
        this._showGestureAnimation('Play');
        this._hideCenterPlayCard();
      }).catch((err) => {
        console.warn('Playback blocked or failed:', err);
      });
    } else {
      this.video.pause();
      this._showGestureAnimation('Pause');
      this._showCenterPlayCard();
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
    if (idx === -1) idx = 2;
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
    if (this.playPauseBtn) {
      const playIcon = this.playPauseBtn.querySelector('.icon-play');
      const pauseIcon = this.playPauseBtn.querySelector('.icon-pause');
      if (playIcon && pauseIcon) {
        playIcon.style.display = isPlaying ? 'none' : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
      }
    }
    if (this.mccPlayPause) {
      const playIcon = this.mccPlayPause.querySelector('.icon-play');
      const pauseIcon = this.mccPlayPause.querySelector('.icon-pause');
      if (playIcon && pauseIcon) {
        playIcon.style.display = isPlaying ? 'none' : 'block';
        pauseIcon.style.display = isPlaying ? 'block' : 'none';
      }
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
    // Update mobile speed pills if present
    document.querySelectorAll('.mp-pill').forEach(pill => {
      const sp = parseFloat(pill.getAttribute('data-speed'));
      if (sp === this.video.playbackRate) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
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
    clearTimeout(this.hideControlsTimeout);
    if (!this.video.paused) {
      this.hideControlsTimeout = setTimeout(() => {
        if (!this.isDraggingTimeline && !this._isAnyMenuOpen()) {
          if (this.controlsOverlay) this.controlsOverlay.classList.add('hidden');
          if (this.mccContainer) this.mccContainer.classList.add('hidden');
          if (this.videoWrapper) this.videoWrapper.style.cursor = 'none';
        }
      }, 3500);
    } else {
      if (this.controlsOverlay) this.controlsOverlay.classList.remove('hidden');
      if (this.mccContainer) this.mccContainer.classList.remove('hidden');
      if (this.videoWrapper) this.videoWrapper.style.cursor = 'default';
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
