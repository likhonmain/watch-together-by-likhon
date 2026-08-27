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

  // Local File Input
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelection(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelection(e.target.files[0]);
      }
    });
  }

  function handleFileSelection(file) {
    player.loadLocalFile(file);
    mediaLoaded = true;

    // Update Badge UI
    if (fileInfoBadge && fileNameText) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
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

      if (fileInfoBadge && fileNameText) {
        fileNameText.innerText = `✅ Stream: ${url.split('/').pop().split('?')[0] || url}`;
        fileInfoBadge.classList.add('active');
      }

      showToast('Stream URL loaded', true, 3000);
      updateStartButtonState();
    });
  }

  // Subtitle File Loader
  if (subFileInput) {
    subFileInput.addEventListener('change', (e) => {
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

  /* ------------------------------------------------------------------------
     2. Room Creation & Joining (WebRTC P2P)
     ------------------------------------------------------------------------ */
  if (btnCreateRoom) {
    btnCreateRoom.addEventListener('click', async () => {
      btnCreateRoom.innerText = 'Creating...';
      btnCreateRoom.disabled = true;
      try {
        const roomId = await sync.createRoom();
        roomJoined = true;
        updateRoomUI(roomId);
        voice.initCallListener();
        showToast(`Room created: ${roomId}. Copy the link and send to your friend!`, true, 5000);
        updateStartButtonState();
      } catch (err) {
        console.error('Create room error:', err);
        showToast('Could not create room. Please try again.', false);
      } finally {
        btnCreateRoom.innerText = 'Create New Room';
        btnCreateRoom.disabled = false;
      }
    });
  }

  if (btnJoinRoom && inputRoomCode) {
    btnJoinRoom.addEventListener('click', async () => {
      const code = inputRoomCode.value.trim();
      if (!code) {
        showToast('Please enter a valid room code.', false);
        return;
      }
      btnJoinRoom.innerText = 'Joining...';
      btnJoinRoom.disabled = true;
      try {
        await sync.joinRoom(code);
        roomJoined = true;
        updateRoomUI(code);
        voice.initCallListener();
        showToast(`Joining room: ${code}...`, true, 3000);
        updateStartButtonState();
      } catch (err) {
        console.error('Join room error:', err);
        showToast('Could not join room. Make sure Host created the room first.', false);
      } finally {
        btnJoinRoom.innerText = 'Join Room';
        btnJoinRoom.disabled = false;
      }
    });
  }

  // Auto-join from URL parameter (?room=xyz)
  const urlParams = new URLSearchParams(window.location.search);
  const autoRoom = urlParams.get('room');
  if (autoRoom) {
    console.log(`[App] Auto-joining room from URL: ${autoRoom}`);
    inputRoomCode.value = autoRoom;
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
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomId}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }

  // Wire Room Strip Buttons
  if (btnPromptPick && fileInput) {
    btnPromptPick.addEventListener('click', () => fileInput.click());
  }

  if (stripBtnPickFile && fileInput) {
    stripBtnPickFile.addEventListener('click', () => fileInput.click());
  }

  if (stripBtnCreate && btnCreateRoom) {
    stripBtnCreate.addEventListener('click', () => {
      // If room already exists, clicking new room creates a new one
      btnCreateRoom.click();
    });
  }

  if (stripBtnCopy && btnCopyLink) {
    stripBtnCopy.addEventListener('click', () => btnCopyLink.click());
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
    if (!statusDot || !statusText) return;

    if (status === 'connected') {
      statusDot.className = 'status-dot connected';
      statusText.innerText = 'Connected with Friend';
      if (modalPeerStatus) {
        modalPeerStatus.innerHTML = '<span style="color: var(--accent-success); font-weight: bold;">🎉 Friend is in the room! Both ready to watch.</span>';
      }
    } else if (status === 'connecting') {
      statusDot.className = 'status-dot connecting';
      statusText.innerText = detail || 'Connecting...';
      if (modalPeerStatus) {
        modalPeerStatus.innerHTML = '<span style="color: var(--accent-warning);">⏳ Connecting to peer...</span>';
      }
    } else if (status === 'ready') {
      statusDot.className = 'status-dot connecting';
      statusText.innerText = sync.isHost ? 'Waiting for Friend...' : 'Room Ready';
      if (modalPeerStatus) {
        modalPeerStatus.innerHTML = '<span style="color: var(--accent-warning);">⏳ Waiting for your friend to join... (Share link above)</span>';
      }
    } else {
      statusDot.className = 'status-dot';
      statusText.innerText = detail || 'Disconnected';
      if (modalPeerStatus) {
        modalPeerStatus.innerHTML = '<span style="color: var(--text-muted);">Not connected to anyone yet.</span>';
      }
    }
  };

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
