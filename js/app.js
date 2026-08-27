/**
 * Watch Together by Likhon — Main Application Coordinator
 * Connects UI, SyncEngine, VideoPlayer, SubtitleManager, VoiceEngine, and ChatManager.
 */

document.addEventListener('DOMContentLoaded', async () => {
  console.log('[App] Initializing Watch Together by Likhon...');

  // Initialize Core Subsystems
  const sync = new SyncEngine();
  const subtitles = new SubtitleManager();
  const player = new VideoPlayer(sync, subtitles);
  const voice = new VoiceEngine(sync);
  const chat = new ChatManager(sync);

  // Expose to window for debugging and cross-component access
  window.sync = sync;
  window.subtitles = subtitles;
  window.player = player;
  window.voice = voice;
  window.chat = chat;

  // DOM Elements
  const setupOverlay = document.getElementById('setup-overlay');
  const btnCreateRoom = document.getElementById('btn-create-room');
  const btnJoinRoom = document.getElementById('btn-join-room');
  const inputRoomCode = document.getElementById('input-room-code');
  const roomDisplay = document.getElementById('room-id-display');
  const btnCopyLink = document.getElementById('btn-copy-link');
  const btnDismissSetup = document.getElementById('btn-dismiss-setup');
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const pingDisplay = document.getElementById('ping-display');
  const toastBanner = document.getElementById('format-warning-banner');

  // Media Source Elements
  const tabLocal = document.getElementById('tab-local');
  const tabUrl = document.getElementById('tab-url');
  const panelLocal = document.getElementById('panel-local');
  const panelUrl = document.getElementById('panel-url');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');
  const urlInput = document.getElementById('url-input');
  const btnLoadUrl = document.getElementById('btn-load-url');
  const fileInfoBadge = document.getElementById('file-info-badge');
  const fileNameText = document.getElementById('file-name-text');
  const subFileInput = document.getElementById('sub-file-input');

  // Room Status Inside Setup Modal
  const modalPeerStatus = document.getElementById('modal-peer-status');

  // Room Strip Elements
  const stripRoomCode = document.getElementById('strip-room-code');
  const stripBtnCopy = document.getElementById('strip-btn-copy');
  const stripBtnCreate = document.getElementById('strip-btn-create');
  const stripBtnReconnect = document.getElementById('strip-btn-reconnect');
  const stripBtnPickFile = document.getElementById('strip-btn-pick-file');
  const btnPromptPick = document.getElementById('btn-prompt-pick');

  // Voice Elements
  const btnVoiceToggle = document.getElementById('btn-voice-toggle');
  const btnVoiceMute = document.getElementById('btn-voice-mute');
  const voiceSpeakingPulse = document.getElementById('voice-speaking-pulse');

  let mediaLoaded = false;
  let roomJoined = false;

  function showToast(msg, isSuccess = false, duration = 4000) {
    if (!toastBanner) return;
    toastBanner.innerText = msg;
    toastBanner.style.background = isSuccess ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)';
    toastBanner.style.display = 'block';
    setTimeout(() => {
      toastBanner.style.display = 'none';
    }, duration);
  }

  /* ------------------------------------------------------------------------
     1. Media Loading (Local File & Direct URL)
     ------------------------------------------------------------------------ */
  // Tab Switcher
  if (tabLocal && tabUrl) {
    tabLocal.addEventListener('click', () => {
      tabLocal.classList.add('active');
      tabUrl.classList.remove('active');
      panelLocal.style.display = 'block';
      panelUrl.style.display = 'none';
    });

    tabUrl.addEventListener('click', () => {
      tabUrl.classList.add('active');
      tabLocal.classList.remove('active');
      panelUrl.style.display = 'block';
      panelLocal.style.display = 'none';
    });
  }

  // Local File Input (Direct Master Listener)
  if (fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  // Bind all file picker triggers across Desktop & Mobile
  const pickTriggers = [
    'desktop-pick-file-btn',
    'dv-btn-pick',
    'strip-btn-pick-file',
    'mp-btn-pick'
  ];
  pickTriggers.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        if (fileInput) fileInput.click();
      });
    }
  });

  function handleFileSelection(file) {
    player.loadLocalFile(file);
    mediaLoaded = true;

    // Hide idle backdrop
    const idleBackdrop = document.getElementById('video-idle-backdrop');
    if (idleBackdrop) idleBackdrop.classList.add('hidden');

    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const movieLabel = `🎬 ${file.name} (${sizeMb} MB)`;

    // Update Desktop Bar Title
    const dvTitle = document.getElementById('dv-title');
    if (dvTitle) dvTitle.innerText = movieLabel;

    // Update Mobile Title
    const mpTitle = document.getElementById('mp-movie-title');
    if (mpTitle) mpTitle.innerText = movieLabel;

    if (fileInfoBadge && fileNameText) {
      fileNameText.innerText = `✅ Loaded: ${file.name} (${sizeMb} MB)`;
      fileInfoBadge.classList.add('active');
    }

    showToast(`Movie loaded: ${file.name}`, true, 3000);
    updateStartButtonState();
  }

  // Direct URL Input
  if (btnLoadUrl && urlInput) {
    btnLoadUrl.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url) return;
      player.loadStreamUrl(url);
      mediaLoaded = true;

      const idleBackdrop = document.getElementById('video-idle-backdrop');
      if (idleBackdrop) idleBackdrop.classList.add('hidden');

      const streamTitle = url.split('/').pop().split('?')[0] || url;
      const movieLabel = `🎬 ${streamTitle}`;

      const dvTitle = document.getElementById('dv-title');
      if (dvTitle) dvTitle.innerText = movieLabel;

      const mpTitle = document.getElementById('mp-movie-title');
      if (mpTitle) mpTitle.innerText = movieLabel;

      showToast('Stream URL loaded', true, 3000);
      updateStartButtonState();
    });
  }

  // Subtitle File Loaders (Desktop & Mobile)
  ['sub-file-input', 'desktop-sub-file-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          subtitles.parse(event.target.result);
          showToast(`Subtitles loaded: ${file.name}`, true, 3000);
        };
        reader.readAsText(file);
      });
    }
  });

  // Desktop Subtitle Controls
  const desktopSubToggle = document.getElementById('desktop-sub-toggle');
  if (desktopSubToggle) {
    desktopSubToggle.addEventListener('click', () => {
      const isVisible = subtitles.toggle();
      desktopSubToggle.innerText = `Subtitles: ${isVisible ? 'ON' : 'OFF'}`;
      desktopSubToggle.classList.toggle('btn-primary', isVisible);
    });
  }

  const desktopSubMinus = document.getElementById('desktop-sub-minus');
  const desktopSubPlus = document.getElementById('desktop-sub-plus');
  const desktopSubReset = document.getElementById('desktop-sub-reset');
  const desktopSubOffset = document.getElementById('desktop-sub-offset');

  function updateDesktopSubOffset() {
    if (desktopSubOffset) {
      const ms = subtitles.offsetMs;
      desktopSubOffset.innerText = `${ms > 0 ? '+' : ''}${ms}ms`;
    }
  }

  if (desktopSubMinus) {
    desktopSubMinus.addEventListener('click', () => {
      subtitles.adjustOffset(-250);
      updateDesktopSubOffset();
    });
  }
  if (desktopSubPlus) {
    desktopSubPlus.addEventListener('click', () => {
      subtitles.adjustOffset(250);
      updateDesktopSubOffset();
    });
  }
  if (desktopSubReset) {
    desktopSubReset.addEventListener('click', () => {
      subtitles.resetOffset();
      updateDesktopSubOffset();
    });
  }

  /* ------------------------------------------------------------------------
     2. Room Creation & Joining (WebRTC P2P)
     ------------------------------------------------------------------------ */
  async function performCreateRoom(btnElement) {
    if (btnElement) {
      btnElement.innerText = 'Creating...';
      btnElement.disabled = true;
    }
    try {
      const roomId = await sync.createRoom();
      roomJoined = true;
      updateRoomUI(roomId);
      voice.initCallListener();
      showToast(`Room created: ${roomId}! Invite link ready.`, true, 5000);
      updateStartButtonState();
    } catch (err) {
      console.error('Create room error:', err);
      showToast('Could not create room. Please try again.', false);
    } finally {
      if (btnElement) {
        btnElement.innerText = btnElement.id === 'desktop-btn-create' ? '➕ Create Room' : 'Create New Room';
        btnElement.disabled = false;
      }
    }
  }

  async function performJoinRoom(code, btnElement) {
    code = String(code || '').trim();
    if (!code) {
      showToast('Please enter the 3-digit room code.', false);
      return;
    }
    if (btnElement) {
      btnElement.innerText = 'Joining...';
      btnElement.disabled = true;
    }
    try {
      await sync.joinRoom(code);
      roomJoined = true;
      updateRoomUI(code);
      voice.initCallListener();
      showToast(`Joined room: ${code}!`, true, 3000);
      updateStartButtonState();
    } catch (err) {
      console.error('Join room error:', err);
      showToast('Could not join room. Make sure Host created the room first.', false);
    } finally {
      if (btnElement) {
        btnElement.innerText = 'Join';
        btnElement.disabled = false;
      }
    }
  }

  // Mobile / Generic Room Buttons
  if (btnCreateRoom) {
    btnCreateRoom.addEventListener('click', () => performCreateRoom(btnCreateRoom));
  }

  if (btnJoinRoom && inputRoomCode) {
    btnJoinRoom.addEventListener('click', () => {
      performJoinRoom(inputRoomCode.value.trim(), btnJoinRoom);
    });
    inputRoomCode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performJoinRoom(inputRoomCode.value.trim(), btnJoinRoom);
    });
  }

  // Desktop Sidebar Room Buttons
  const desktopBtnCreate = document.getElementById('desktop-btn-create');
  if (desktopBtnCreate) {
    desktopBtnCreate.addEventListener('click', () => performCreateRoom(desktopBtnCreate));
  }

  const desktopJoinBtn = document.getElementById('desktop-join-btn');
  const desktopJoinInput = document.getElementById('desktop-join-input');
  if (desktopJoinBtn && desktopJoinInput) {
    desktopJoinBtn.addEventListener('click', () => {
      performJoinRoom(desktopJoinInput.value.trim(), desktopJoinBtn);
    });
    desktopJoinInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') performJoinRoom(desktopJoinInput.value.trim(), desktopJoinBtn);
    });
  }

  // Auto-join from URL parameter (?room=xyz)
  const urlParams = new URLSearchParams(window.location.search);
  const autoRoom = urlParams.get('room');
  if (autoRoom) {
    console.log(`[App] Auto-joining room from URL: ${autoRoom}`);
    if (inputRoomCode) inputRoomCode.value = autoRoom;
    if (desktopJoinInput) desktopJoinInput.value = autoRoom;
    updateRoomUI(autoRoom);
    sync.joinRoom(autoRoom).then(() => {
      roomJoined = true;
      voice.initCallListener();
      updateStartButtonState();
    }).catch(e => {
      console.error('Auto-join error:', e);
      showToast('Could not connect to host. Make sure host is online.', false);
    });
  }

  function updateRoomUI(roomId) {
    if (roomDisplay) {
      roomDisplay.innerText = roomId;
    }
    if (stripRoomCode) {
      stripRoomCode.innerText = roomId;
    }
    if (stripBtnCopy) {
      stripBtnCopy.style.display = 'inline-flex';
    }
    if (stripBtnCreate) {
      stripBtnCreate.innerText = 'New Room';
    }

    // Desktop Sidebar
    const desktopRoomCode = document.getElementById('desktop-room-code');
    const desktopRoomStatus = document.getElementById('desktop-room-status');
    if (desktopRoomCode) desktopRoomCode.innerText = roomId;
    if (desktopRoomStatus) desktopRoomStatus.innerHTML = '<span style="color: var(--accent-warning);">⏳ Waiting for friend to join...</span>';

    // Mobile Panel
    const mpRoomLabel = document.getElementById('mp-room-label');
    const mpInfoCode = document.getElementById('mp-info-code');
    const mpInfoStatus = document.getElementById('mp-info-status');
    if (mpRoomLabel) mpRoomLabel.innerText = `Room: ${roomId}`;
    if (mpInfoCode) mpInfoCode.innerText = roomId;
    if (mpInfoStatus) mpInfoStatus.innerText = '⌛ Waiting for Friend...';

    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomId}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }

  // Bind All Copy Link Triggers
  const copyTriggers = ['desktop-btn-copy', 'dv-btn-copy-link', 'btn-copy-link', 'strip-btn-copy'];
  copyTriggers.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        const roomId = sync.roomId;
        if (!roomId) {
          showToast('Please create or join a room first!', false);
          return;
        }
        const inviteUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomId}`;
        navigator.clipboard.writeText(inviteUrl).then(() => {
          showToast('📋 Room invite link copied to clipboard!', true);
        }).catch(() => {
          showToast(`Invite link: ${inviteUrl}`, true, 6000);
        });
      });
    }
  });

  if (stripBtnCreate && btnCreateRoom) {
    stripBtnCreate.addEventListener('click', () => {
      // If room already exists, clicking new room creates a new one
      btnCreateRoom.click();
    });
  }

  if (stripBtnCopy && btnCopyLink) {
    stripBtnCopy.addEventListener('click', () => btnCopyLink.click());
  }

  if (stripBtnReconnect) {
    stripBtnReconnect.addEventListener('click', () => {
      if (sync.roomId) {
        showToast(`Reconnecting to ${sync.roomId}...`, true, 3000);
        if (sync.isHost) {
          sync.init(sync.roomId);
        } else {
          sync.joinRoom(sync.roomId);
        }
      }
    });
  }

  // Copy Shareable Invite Link
  if (btnCopyLink) {
    btnCopyLink.addEventListener('click', () => {
      if (!sync.roomId && !autoRoom) {
        showToast('Please click "Create New Room" first!', false);
        return;
      }
      const shareUrl = window.location.href;
      navigator.clipboard.writeText(shareUrl).then(() => {
        const originalText = btnCopyLink.innerHTML;
        btnCopyLink.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Copied!`;
        showToast('Link copied! Send it to your friend.', true, 3000);
        setTimeout(() => {
          btnCopyLink.innerHTML = originalText;
        }, 2000);
      }).catch(() => {
        showToast(`Your room link: ${window.location.href}`, true, 6000);
      });
    });
  }

  // Dismiss Setup manually by user
  if (btnDismissSetup) {
    btnDismissSetup.addEventListener('click', () => {
      setupOverlay.classList.add('hidden');
      player.video.pause();
    });
  }

  function updateStartButtonState() {
    if (!btnDismissSetup) return;
    if (mediaLoaded && roomJoined) {
      btnDismissSetup.innerText = '▶ Enter Theater & Watch Together';
      btnDismissSetup.classList.add('btn-gradient');
      btnDismissSetup.disabled = false;
    } else if (mediaLoaded && !roomJoined) {
      btnDismissSetup.innerText = '⚠️ Please Create or Join a Room (Step 2)';
    } else if (!mediaLoaded && roomJoined) {
      btnDismissSetup.innerText = '⚠️ Please Choose Movie File (Step 1)';
    } else {
      btnDismissSetup.innerText = 'Complete Steps 1 & 2 to Start Watching';
    }
  }

  // Re-open setup modal if user clicks setup button in header
  const btnOpenSetup = document.getElementById('btn-open-setup');
  if (btnOpenSetup) {
    btnOpenSetup.addEventListener('click', () => {
      setupOverlay.classList.toggle('hidden');
    });
  }

  /* ------------------------------------------------------------------------
     3. Sync Status & Peer Join / Leave Handlers
     ------------------------------------------------------------------------ */
  sync.onStatusChange = (status, detail) => {
    const mpStatusDot = document.getElementById('mp-status-dot');
    const mpStatusText = document.getElementById('mp-status-text');
    const mpInfoStatus = document.getElementById('mp-info-status');
    const mpBtnReconnect = document.getElementById('mp-btn-reconnect');

    const dvStatusDot = document.getElementById('dv-status-dot');
    const dvStatusText = document.getElementById('dv-status-text');
    const desktopRoomStatus = document.getElementById('desktop-room-status');

    if (status === 'connected') {
      if (statusDot) statusDot.className = 'status-dot connected';
      if (statusText) statusText.innerText = 'Connected with Friend';
      if (dvStatusDot) dvStatusDot.className = 'status-dot connected';
      if (dvStatusText) dvStatusText.innerText = 'Connected with Friend';
      if (desktopRoomStatus) desktopRoomStatus.innerHTML = '<span style="color: var(--accent-success); font-weight: 600;">🟢 Connected with Friend</span>';

      if (mpStatusDot) mpStatusDot.className = 'status-dot connected';
      if (mpStatusText) mpStatusText.innerText = 'Connected with Friend';
      if (mpInfoStatus) mpInfoStatus.innerHTML = '<span style="color: var(--accent-success);">🟢 Connected with Friend</span>';

      if (stripBtnReconnect) stripBtnReconnect.style.display = 'none';
      if (mpBtnReconnect) mpBtnReconnect.style.display = 'none';
    } else if (status === 'connecting') {
      if (statusDot) statusDot.className = 'status-dot connecting';
      if (statusText) statusText.innerText = detail || 'Connecting...';
      if (dvStatusDot) dvStatusDot.className = 'status-dot connecting';
      if (dvStatusText) dvStatusText.innerText = detail || 'Connecting...';
      if (desktopRoomStatus) desktopRoomStatus.innerHTML = `<span style="color: var(--accent-warning);">⏳ ${detail || 'Connecting...'}</span>`;

      if (mpStatusDot) mpStatusDot.className = 'status-dot connecting';
      if (mpStatusText) mpStatusText.innerText = detail || 'Connecting...';
      if (mpInfoStatus) mpInfoStatus.innerHTML = `<span style="color: var(--accent-warning);">⏳ ${detail || 'Connecting...'}</span>`;

      if (stripBtnReconnect) stripBtnReconnect.style.display = 'none';
      if (mpBtnReconnect) mpBtnReconnect.style.display = 'none';
    } else if (status === 'ready') {
      if (statusDot) statusDot.className = 'status-dot connecting';
      const msg = sync.isHost ? 'Waiting for Friend...' : 'Room Ready';
      if (statusText) statusText.innerText = msg;
      if (dvStatusDot) dvStatusDot.className = 'status-dot connecting';
      if (dvStatusText) dvStatusText.innerText = msg;
      if (desktopRoomStatus) desktopRoomStatus.innerHTML = `<span style="color: var(--accent-warning);">⏳ ${msg}</span>`;

      if (mpStatusDot) mpStatusDot.className = 'status-dot connecting';
      if (mpStatusText) mpStatusText.innerText = msg;
      if (mpInfoStatus) mpInfoStatus.innerHTML = `<span style="color: var(--accent-warning);">⏳ ${msg}</span>`;

      if (stripBtnReconnect) stripBtnReconnect.style.display = 'none';
      if (mpBtnReconnect) mpBtnReconnect.style.display = 'none';
    } else {
      if (statusDot) statusDot.className = 'status-dot';
      if (statusText) statusText.innerText = detail || 'Disconnected';
      if (dvStatusDot) dvStatusDot.className = 'status-dot';
      if (dvStatusText) dvStatusText.innerText = detail || 'Disconnected';
      if (desktopRoomStatus) desktopRoomStatus.innerText = 'Create or join a room to sync';

      if (mpStatusDot) mpStatusDot.className = 'status-dot';
      if (mpStatusText) mpStatusText.innerText = detail || 'Disconnected';
      if (mpInfoStatus) mpInfoStatus.innerHTML = `<span style="color: var(--accent-danger);">❌ Disconnected</span>`;

      if (stripBtnReconnect && sync.roomId && !sync.isHost) {
        stripBtnReconnect.style.display = 'inline-flex';
      }
      if (mpBtnReconnect && sync.roomId && !sync.isHost) {
        mpBtnReconnect.style.display = 'block';
      }
    }
  };

  /* ------------------------------------------------------------------------
     4. Mobile Portrait Panel Controls Wiring
     ------------------------------------------------------------------------ */
  function setupMobilePanel() {
    // Tab switching
    document.querySelectorAll('.mp-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mp-tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.mp-tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const targetId = btn.getAttribute('data-tab');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    // Pick Movie Button
    const mpBtnPick = document.getElementById('mp-btn-pick');
    if (mpBtnPick && fileInput) {
      mpBtnPick.addEventListener('click', () => fileInput.click());
    }

    // Invite Friend (Copy Link)
    const mpBtnCopy = document.getElementById('mp-btn-copy-link');
    if (mpBtnCopy && btnCopyLink) {
      mpBtnCopy.addEventListener('click', () => btnCopyLink.click());
    }

    // Room Button
    const mpBtnRoom = document.getElementById('mp-btn-room');
    if (mpBtnRoom) {
      mpBtnRoom.addEventListener('click', () => {
        if (!sync.roomId) {
          if (btnCreateRoom) btnCreateRoom.click();
        } else {
          if (btnCopyLink) btnCopyLink.click();
        }
      });
    }

    // Voice Call Button
    const mpBtnVoice = document.getElementById('mp-btn-voice');
    const mpVoiceLabel = document.getElementById('mp-voice-label');
    if (mpBtnVoice && btnVoiceToggle) {
      mpBtnVoice.addEventListener('click', () => {
        btnVoiceToggle.click();
        if (mpVoiceLabel) {
          mpVoiceLabel.innerText = voice.isActive ? 'Leave Voice' : 'Voice Call';
        }
      });
    }

    // Cinema Fullscreen Button
    const mpBtnFullscreen = document.getElementById('mp-btn-fullscreen');
    if (mpBtnFullscreen) {
      mpBtnFullscreen.addEventListener('click', () => {
        player.toggleFullscreen();
      });
    }

    // Speed Pills
    document.querySelectorAll('.mp-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const speed = parseFloat(pill.getAttribute('data-speed'));
        player.setPlaybackSpeed(speed);
      });
    });

    // Subtitles
    const mpSubToggle = document.getElementById('mp-sub-toggle');
    if (mpSubToggle) {
      mpSubToggle.addEventListener('click', () => {
        subtitles.enabled = !subtitles.enabled;
        mpSubToggle.innerText = subtitles.enabled ? 'Subtitles: ON' : 'Subtitles: OFF';
        const mainToggle = document.getElementById('sub-toggle');
        if (mainToggle) mainToggle.innerText = subtitles.enabled ? 'Subtitles: ON' : 'Subtitles: OFF';
        const subDisplay = document.getElementById('subtitle-text');
        if (!subtitles.enabled && subDisplay) subDisplay.innerText = '';
      });
    }

    const mpSubFileInput = document.getElementById('mp-sub-file-input');
    if (mpSubFileInput) {
      mpSubFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          subtitles.parse(ev.target.result);
          showToast(`Subtitles loaded: ${file.name}`, true, 3000);
        };
        reader.readAsText(file);
      });
    }

    const mpSubMinus = document.getElementById('mp-sub-minus');
    const mpSubPlus = document.getElementById('mp-sub-plus');
    const mpSubReset = document.getElementById('mp-sub-reset');
    const mpOffsetDisplay = document.getElementById('mp-offset-display');
    const mainOffsetDisplay = document.getElementById('sub-offset-display');

    const updateOffsetUI = (offset) => {
      const str = `${offset > 0 ? '+' : ''}${offset}ms`;
      if (mpOffsetDisplay) mpOffsetDisplay.innerText = str;
      if (mainOffsetDisplay) mainOffsetDisplay.innerText = str;
    };

    if (mpSubMinus) mpSubMinus.addEventListener('click', () => updateOffsetUI(subtitles.adjustOffset(-250)));
    if (mpSubPlus) mpSubPlus.addEventListener('click', () => updateOffsetUI(subtitles.adjustOffset(250)));
    if (mpSubReset) mpSubReset.addEventListener('click', () => updateOffsetUI(subtitles.resetOffset()));

    // Create Room & Reconnect in Tab 3
    const mpBtnCreate = document.getElementById('mp-btn-create-room');
    if (mpBtnCreate && btnCreateRoom) {
      mpBtnCreate.addEventListener('click', () => btnCreateRoom.click());
    }

    const mpBtnRecon = document.getElementById('mp-btn-reconnect');
    if (mpBtnRecon && stripBtnReconnect) {
      mpBtnRecon.addEventListener('click', () => stripBtnReconnect.click());
    }
  }

  setupMobilePanel();

  sync.onPeerConnected = (peerId) => {
    console.log('[App] Peer connected:', peerId);
    showToast('🎉 Friend has joined your room! Play/pause/seek are now in sync.', true, 5000);
    chat.playNotificationSound();
    chat.appendMessage({
      text: 'Friend has joined the room! Synchronized playback is active.',
      sender: 'System',
      timestamp: Date.now(),
      isMe: false
    });
  };

  sync.onPeerDisconnected = (peerId) => {
    console.log('[App] Peer disconnected:', peerId);
    showToast('⚠️ Friend disconnected from room.', false, 4000);
    chat.appendMessage({
      text: 'Friend disconnected from the room.',
      sender: 'System',
      timestamp: Date.now(),
      isMe: false
    });
  };

  sync.onPingUpdated = (pingMs) => {
    if (pingDisplay) {
      pingDisplay.innerText = `${pingMs}ms`;
    }
  };

  sync.onFileInfoReceived = (fileInfo) => {
    console.log('[Sync] Peer file info:', fileInfo);
    if (player.video.duration && Math.abs(player.video.duration - fileInfo.duration) > 5) {
      showToast(`Warning: Friend's movie duration differs by >5s (${fileInfo.name}). Make sure both use the same file.`, false, 6000);
    } else {
      showToast(`Friend loaded: ${fileInfo.name}`, true, 4000);
    }
  };

  /* ------------------------------------------------------------------------
     4. Voice Call Handlers
     ------------------------------------------------------------------------ */
  if (btnVoiceToggle) {
    btnVoiceToggle.addEventListener('click', async () => {
      if (!voice.isInCall) {
        btnVoiceToggle.innerText = 'Joining...';
        const success = await voice.startCall();
        if (success) {
          btnVoiceToggle.innerText = 'Leave Voice';
          btnVoiceToggle.classList.add('active');
          if (btnVoiceMute) btnVoiceMute.style.display = 'flex';
          showToast('Voice call connected! Speak to test your microphone.', true, 4000);
        } else {
          btnVoiceToggle.innerText = 'Join Voice';
        }
      } else {
        voice.endCall();
        btnVoiceToggle.innerText = 'Join Voice';
        btnVoiceToggle.classList.remove('active');
        if (btnVoiceMute) btnVoiceMute.style.display = 'none';
        if (voiceSpeakingPulse) voiceSpeakingPulse.classList.remove('talking');
        showToast('Left voice call.', false, 2000);
      }
    });
  }

  if (btnVoiceMute) {
    btnVoiceMute.addEventListener('click', () => {
      const isMuted = voice.toggleMute();
      btnVoiceMute.innerText = isMuted ? 'Unmute Mic' : 'Mute Mic';
      if (isMuted) {
        btnVoiceMute.classList.add('muted');
      } else {
        btnVoiceMute.classList.remove('muted');
      }
    });
  }

  voice.onSpeaking = (isTalking) => {
    if (!voiceSpeakingPulse) return;
    if (isTalking) {
      voiceSpeakingPulse.classList.add('talking');
    } else {
      voiceSpeakingPulse.classList.remove('talking');
    }
  };

  console.log('[App] Watch Together by Likhon ready.');
});
