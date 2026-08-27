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

  // Voice Elements
  const btnVoiceToggle = document.getElementById('btn-voice-toggle');
  const btnVoiceMute = document.getElementById('btn-voice-mute');
  const voiceSpeakingPulse = document.getElementById('voice-speaking-pulse');

  let mediaLoaded = false;
  let roomJoined = false;

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
      fileNameText.innerText = `${file.name} (${sizeMb} MB)`;
      fileInfoBadge.classList.add('active');
    }

    checkDismissSetup();
  }

  // Direct URL Input
  if (btnLoadUrl && urlInput) {
    btnLoadUrl.addEventListener('click', () => {
      const url = urlInput.value.trim();
      if (!url) return;
      player.loadStreamUrl(url);
      mediaLoaded = true;

      if (fileInfoBadge && fileNameText) {
        fileNameText.innerText = `Stream: ${url.split('/').pop().split('?')[0] || url}`;
        fileInfoBadge.classList.add('active');
      }

      checkDismissSetup();
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
        alert(`Loaded subtitle: ${file.name}`);
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
      try {
        const roomId = await sync.createRoom();
        roomJoined = true;
        updateRoomUI(roomId);
        voice.initCallListener();
        checkDismissSetup();
      } catch (err) {
        alert('Could not create room. Please try again.');
      } finally {
        btnCreateRoom.innerText = 'Create Room';
      }
    });
  }

  if (btnJoinRoom && inputRoomCode) {
    btnJoinRoom.addEventListener('click', async () => {
      const code = inputRoomCode.value.trim();
      if (!code) {
        alert('Please enter a valid room code.');
        return;
      }
      btnJoinRoom.innerText = 'Joining...';
      try {
        await sync.joinRoom(code);
        roomJoined = true;
        updateRoomUI(code);
        voice.initCallListener();
        checkDismissSetup();
      } catch (err) {
        alert('Could not join room. Check the room code and try again.');
      } finally {
        btnJoinRoom.innerText = 'Join Room';
      }
    });
  }

  // Auto-join from URL parameter (?room=xyz)
  const urlParams = new URLSearchParams(window.location.search);
  const autoRoom = urlParams.get('room');
  if (autoRoom) {
    console.log(`[App] Auto-joining room from URL: ${autoRoom}`);
    inputRoomCode.value = autoRoom;
    sync.joinRoom(autoRoom).then(() => {
      roomJoined = true;
      updateRoomUI(autoRoom);
      voice.initCallListener();
    }).catch(e => console.error('Auto-join error:', e));
  }

  function updateRoomUI(roomId) {
    if (roomDisplay) {
      roomDisplay.innerText = roomId;
    }
    // Update browser URL without reload
    const newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?room=${roomId}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  }

  // Copy Shareable Invite Link
  if (btnCopyLink) {
    btnCopyLink.addEventListener('click', () => {
      const shareUrl = window.location.href;
      navigator.clipboard.writeText(shareUrl).then(() => {
        const originalText = btnCopyLink.innerHTML;
        btnCopyLink.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg> Copied!`;
        setTimeout(() => {
          btnCopyLink.innerHTML = originalText;
        }, 2000);
      });
    });
  }

  if (btnDismissSetup) {
    btnDismissSetup.addEventListener('click', () => {
      setupOverlay.classList.add('hidden');
    });
  }

  function checkDismissSetup() {
    if (mediaLoaded && roomJoined) {
      setupOverlay.classList.add('hidden');
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
     3. Sync Status & Ping Handlers
     ------------------------------------------------------------------------ */
  sync.onStatusChange = (status) => {
    if (!statusDot || !statusText) return;

    if (status === 'connected') {
      statusDot.className = 'status-dot connected';
      statusText.innerText = 'Connected';
    } else if (status === 'connecting') {
      statusDot.className = 'status-dot connecting';
      statusText.innerText = 'Connecting...';
    } else if (status === 'ready') {
      statusDot.className = 'status-dot connecting';
      statusText.innerText = 'Room Ready (Waiting for Friend)';
    } else {
      statusDot.className = 'status-dot';
      statusText.innerText = 'Disconnected';
    }
  };

  sync.onPingUpdated = (pingMs) => {
    if (pingDisplay) {
      pingDisplay.innerText = `${pingMs}ms`;
    }
  };

  sync.onFileInfoReceived = (fileInfo) => {
    console.log('[Sync] Peer file info:', fileInfo);
    // Notify peer if file sizes or durations differ significantly
    if (player.video.duration && Math.abs(player.video.duration - fileInfo.duration) > 5) {
      alert(`Notice: Your friend's video duration differs by more than 5 seconds (${fileInfo.name}). Make sure you both have the exact same file for seamless sync.`);
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
        } else {
          btnVoiceToggle.innerText = 'Join Voice';
        }
      } else {
        voice.endCall();
        btnVoiceToggle.innerText = 'Join Voice';
        btnVoiceToggle.classList.remove('active');
        if (btnVoiceMute) btnVoiceMute.style.display = 'none';
        if (voiceSpeakingPulse) voiceSpeakingPulse.classList.remove('talking');
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
