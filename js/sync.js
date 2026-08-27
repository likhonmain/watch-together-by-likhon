/**
 * Watch Together by Likhon — P2P Synchronization Engine (WebRTC via PeerJS)
 * Handles low-latency state sync, drift correction, ping/RTT, and loop prevention.
 */

class SyncEngine {
  constructor() {
    this.peer = null;
    this.connections = []; // Active DataChannel connections
    this.isHost = false;
    this.roomId = null;
    this.localPeerId = null;
    this.isRemoteUpdate = false; // Flag to prevent infinite echo loops
    this.lastPing = 0;
    this.heartbeatTimer = null;
    this.pingTimer = null;

    // Callbacks
    this.onStatusChange = null;
    this.onActionReceived = null;
    this.onChatReceived = null;
    this.onFileInfoReceived = null;
    this.onPingUpdated = null;
    this.onPeerCountChanged = null;
  }

  /**
   * Initialize PeerJS instance
   */
  init(peerId = null) {
    return new Promise((resolve, reject) => {
      // Free public PeerJS cloud broker with STUN servers
      const options = {
        debug: 1,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
          ]
        }
      };

      if (peerId) {
        this.peer = new Peer(peerId, options);
      } else {
        this.peer = new Peer(options);
      }

      this.peer.on('open', (id) => {
        this.localPeerId = id;
        console.log(`[Sync] Peer initialized with ID: ${id}`);
        this._updateStatus('ready');
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        console.log(`[Sync] Incoming peer connection from: ${conn.peer}`);
        this._setupConnection(conn);
      });

      this.peer.on('error', (err) => {
        console.error('[Sync] Peer error:', err);
        if (this.onStatusChange) this.onStatusChange('error', err.type || 'Connection error');
        reject(err);
      });

      this.peer.on('disconnected', () => {
        console.warn('[Sync] Peer disconnected from signaling server');
        this._updateStatus('disconnected');
      });
    });
  }

  /**
   * Host creates a new room with a random 6-character room ID
   */
  async createRoom() {
    const randomCode = 'wt-' + Math.random().toString(36).substring(2, 8);
    this.isHost = true;
    this.roomId = randomCode;

    if (this.peer) {
      this.peer.destroy();
    }

    await this.init(randomCode);
    this._startHeartbeat();
    return randomCode;
  }

  /**
   * Join an existing room code
   */
  async joinRoom(targetRoomId) {
    targetRoomId = targetRoomId.trim();
    this.isHost = false;
    this.roomId = targetRoomId;

    if (!this.peer || this.peer.destroyed) {
      await this.init();
    }

    this._updateStatus('connecting');
    console.log(`[Sync] Connecting to room: ${targetRoomId}`);

    const conn = this.peer.connect(targetRoomId, {
      reliable: true
    });

    this._setupConnection(conn);
    return targetRoomId;
  }

  /**
   * Configure a data connection
   */
  _setupConnection(conn) {
    conn.on('open', () => {
      console.log(`[Sync] Data channel open with: ${conn.peer}`);
      this.connections.push(conn);
      this._updateStatus('connected');
      this._notifyPeerCount();

      if (this.isHost) {
        this._startHeartbeat();
      }

      this._startPing();
    });

    conn.on('data', (data) => {
      this._handleIncomingData(data, conn);
    });

    conn.on('close', () => {
      console.log(`[Sync] Connection closed with: ${conn.peer}`);
      this.connections = this.connections.filter(c => c.peer !== conn.peer);
      this._notifyPeerCount();
      if (this.connections.length === 0) {
        this._updateStatus('waiting');
      }
    });

    conn.on('error', (err) => {
      console.error(`[Sync] Connection error with ${conn.peer}:`, err);
    });
  }

  /**
   * Handle incoming sync messages
   */
  _handleIncomingData(data, conn) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'play':
      case 'pause':
      case 'seek':
      case 'rate':
        this.isRemoteUpdate = true;
        if (this.onActionReceived) this.onActionReceived(data);
        // Reset remote update lock after short debounce
        setTimeout(() => { this.isRemoteUpdate = false; }, 300);
        break;

      case 'heartbeat':
        // Periodic drift check from host
        if (!this.isHost && this.onActionReceived) {
          this.onActionReceived(data);
        }
        break;

      case 'chat':
        if (this.onChatReceived) this.onChatReceived(data);
        break;

      case 'file_info':
        if (this.onFileInfoReceived) this.onFileInfoReceived(data);
        break;

      case 'ping':
        conn.send({ type: 'pong', sendTime: data.sendTime });
        break;

      case 'pong':
        const rtt = Date.now() - data.sendTime;
        this.lastPing = Math.round(rtt / 2);
        if (this.onPingUpdated) this.onPingUpdated(this.lastPing);
        break;

      default:
        console.log('[Sync] Unknown message:', data);
    }
  }

  /**
   * Broadcast payload to all connected peers
   */
  broadcast(data) {
    if (this.isRemoteUpdate) return; // Prevent echoing remote events back
    if (!this.connections || this.connections.length === 0) return;

    for (const conn of this.connections) {
      if (conn.open) {
        try {
          conn.send(data);
        } catch (e) {
          console.error('[Sync] Broadcast error:', e);
        }
      }
    }
  }

  /* Sync Action Helpers */
  sendPlay(currentTime, playbackRate) {
    this.broadcast({
      type: 'play',
      time: currentTime,
      rate: playbackRate,
      timestamp: Date.now()
    });
  }

  sendPause(currentTime) {
    this.broadcast({
      type: 'pause',
      time: currentTime,
      timestamp: Date.now()
    });
  }

  sendSeek(currentTime) {
    this.broadcast({
      type: 'seek',
      time: currentTime,
      timestamp: Date.now()
    });
  }

  sendRate(rate) {
    this.broadcast({
      type: 'rate',
      rate: rate,
      timestamp: Date.now()
    });
  }

  sendChat(text, sender) {
    const msg = {
      type: 'chat',
      text: text,
      sender: sender,
      timestamp: Date.now()
    };
    this.broadcast(msg);
    return msg;
  }

  sendFileInfo(name, size, duration) {
    this.broadcast({
      type: 'file_info',
      name: name,
      size: size,
      duration: duration
    });
  }

  /**
   * Periodic heartbeat from host to clients (drift correction)
   */
  _startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (this.isHost && window.player) {
        const v = window.player.video;
        if (v && !isNaN(v.duration)) {
          this.broadcast({
            type: 'heartbeat',
            time: v.currentTime,
            isPlaying: !v.paused,
            rate: v.playbackRate,
            timestamp: Date.now()
          });
        }
      }
    }, 2000);
  }

  /**
   * Periodic ping for latency display
   */
  _startPing() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    this.pingTimer = setInterval(() => {
      if (this.connections.length > 0) {
        for (const conn of this.connections) {
          if (conn.open) {
            conn.send({ type: 'ping', sendTime: Date.now() });
          }
        }
      }
    }, 5000);
  }

  _updateStatus(status) {
    if (this.onStatusChange) this.onStatusChange(status);
  }

  _notifyPeerCount() {
    if (this.onPeerCountChanged) {
      this.onPeerCountChanged(this.connections.length);
    }
  }

  destroy() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.peer) this.peer.destroy();
    this.connections = [];
  }
}

window.SyncEngine = SyncEngine;
