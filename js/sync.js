/**
 * Watch Together by Likhon — P2P Synchronization Engine (WebRTC via PeerJS)
 * Features Open Relay Project TURN servers for guaranteed mobile/NAT traversal,
 * bidirectional handshake, collision auto-retry, and drift correction.
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
    this.peerReady = false;

    // Callbacks
    this.onStatusChange = null;   // (status: string, detail?: string) => void
    this.onPeerConnected = null;  // (peerId: string) => void
    this.onPeerDisconnected = null; // (peerId: string) => void
    this.onActionReceived = null; // (actionData: object) => void
    this.onChatReceived = null;   // (chatData: object) => void
    this.onFileInfoReceived = null; // (fileInfo: object) => void
    this.onPingUpdated = null;    // (pingMs: number) => void
    this.onPeerCountChanged = null; // (count: number) => void
  }

  /**
   * Get production-grade WebRTC configuration with Google STUN + Open Relay TURN
   * (Essential for mobile 4G/5G carriers and Symmetric NAT)
   */
  _getPeerConfig() {
    return {
      debug: 1,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:openrelay.metered.ca:80' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443?transport=tcp',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      }
    };
  }

  /**
   * Initialize PeerJS instance
   */
  init(customId = null) {
    return new Promise((resolve, reject) => {
      if (this.peer && !this.peer.destroyed) {
        this.peer.destroy();
      }

      this.peerReady = false;
      const options = this._getPeerConfig();

      console.log(`[Sync] Initializing PeerJS${customId ? ' with ID: ' + customId : ''}...`);
      this._updateStatus('connecting', 'Connecting to signaling server...');

      try {
        if (customId) {
          this.peer = new Peer(customId, options);
        } else {
          this.peer = new Peer(options);
        }
      } catch (err) {
        console.error('[Sync] Peer constructor failed:', err);
        this._updateStatus('error', 'Could not initialize Peer connection.');
        return reject(err);
      }

      this.peer.on('open', (id) => {
        this.localPeerId = id;
        this.peerReady = true;
        console.log(`[Sync] Peer successfully opened with ID: ${id}`);
        this._updateStatus('ready', `Room ready: ${id}`);
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        console.log(`[Sync] Incoming peer connection from: ${conn.peer}`);
        this._setupConnection(conn, false);
      });

      this.peer.on('error', (err) => {
        console.error('[Sync] Peer error:', err.type, err.message);

        if (err.type === 'unavailable-id') {
          // If custom ID is taken, auto-retry with a unique code
          console.warn('[Sync] Room ID taken, retrying with new ID...');
          const newCode = 'wt-' + Math.random().toString(36).substring(2, 8);
          this.roomId = newCode;
          this.init(newCode).then(resolve).catch(reject);
          return;
        } else if (err.type === 'peer-unavailable') {
          this._updateStatus('error', 'Room not found. Make sure the Host has created the room and is online.');
        } else {
          this._updateStatus('error', err.type || 'Connection error');
        }
        reject(err);
      });

      this.peer.on('disconnected', () => {
        console.warn('[Sync] Peer disconnected from broker server. Reconnecting...');
        this._updateStatus('disconnected', 'Signaling disconnected');
        if (this.peer && !this.peer.destroyed) {
          this.peer.reconnect();
        }
      });
    });
  }

  /**
   * Host creates a new room
   */
  async createRoom() {
    // Generate clean 6-character room code
    const randomCode = 'wt-' + Math.random().toString(36).substring(2, 8);
    this.isHost = true;
    this.roomId = randomCode;

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

    if (!this.peer || this.peer.destroyed || !this.peerReady) {
      await this.init();
    }

    this._updateStatus('connecting', `Connecting to room: ${targetRoomId}...`);
    console.log(`[Sync] Initiating connection to room: ${targetRoomId}`);

    const conn = this.peer.connect(targetRoomId, {
      reliable: true
    });

    this._setupConnection(conn, true);
    return targetRoomId;
  }

  /**
   * Configure a data connection with handshake & ping
   */
  _setupConnection(conn, isInitiator) {
    conn.on('open', () => {
      console.log(`[Sync] DataChannel OPEN with peer: ${conn.peer}`);
      if (!this.connections.find(c => c.peer === conn.peer)) {
        this.connections.push(conn);
      }

      this._updateStatus('connected', `Connected with peer (${this.connections.length} in room)`);
      this._notifyPeerCount();

      if (this.onPeerConnected) {
        this.onPeerConnected(conn.peer);
      }

      // Send initial handshake
      conn.send({
        type: 'handshake',
        role: this.isHost ? 'host' : 'client',
        sender: this.localPeerId,
        timestamp: Date.now()
      });

      if (this.isHost) {
        this._startHeartbeat();
      }
      this._startPing();
    });

    conn.on('data', (data) => {
      this._handleIncomingData(data, conn);
    });

    conn.on('close', () => {
      console.log(`[Sync] Connection closed with peer: ${conn.peer}`);
      this.connections = this.connections.filter(c => c.peer !== conn.peer);
      this._notifyPeerCount();

      if (this.onPeerDisconnected) {
        this.onPeerDisconnected(conn.peer);
      }

      if (this.connections.length === 0) {
        this._updateStatus('ready', this.isHost ? 'Waiting for friend...' : 'Disconnected from Host');
      } else {
        this._updateStatus('connected', `Connected with ${this.connections.length} peer(s)`);
      }
    });

    conn.on('error', (err) => {
      console.error(`[Sync] DataChannel error with ${conn.peer}:`, err);
    });
  }

  /**
   * Handle incoming sync messages
   */
  _handleIncomingData(data, conn) {
    if (!data || !data.type) return;

    switch (data.type) {
      case 'handshake':
        console.log(`[Sync] Handshake confirmed with ${conn.peer} (${data.role})`);
        this._updateStatus('connected', `Connected with friend!`);
        break;

      case 'play':
      case 'pause':
      case 'seek':
      case 'rate':
        this.isRemoteUpdate = true;
        if (this.onActionReceived) this.onActionReceived(data);
        setTimeout(() => { this.isRemoteUpdate = false; }, 350);
        break;

      case 'heartbeat':
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
        try {
          conn.send({ type: 'pong', sendTime: data.sendTime });
        } catch (e) {}
        break;

      case 'pong':
        const rtt = Date.now() - data.sendTime;
        this.lastPing = Math.max(1, Math.round(rtt / 2));
        if (this.onPingUpdated) this.onPingUpdated(this.lastPing);
        break;

      default:
        console.log('[Sync] Unknown message type:', data);
    }
  }

  /**
   * Broadcast payload to all connected peers
   */
  broadcast(data) {
    if (this.isRemoteUpdate) return;
    if (!this.connections || this.connections.length === 0) return;

    for (const conn of this.connections) {
      if (conn.open) {
        try {
          conn.send(data);
        } catch (e) {
          console.error('[Sync] Broadcast send error:', e);
        }
      }
    }
  }

  /* Action Helpers */
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
      if (this.isHost && window.player && this.connections.length > 0) {
        const v = window.player.video;
        if (v && !isNaN(v.duration) && v.duration > 0) {
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
            try {
              conn.send({ type: 'ping', sendTime: Date.now() });
            } catch (e) {}
          }
        }
      }
    }, 4000);
  }

  _updateStatus(status, detail = '') {
    if (this.onStatusChange) this.onStatusChange(status, detail);
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
    this.peerReady = false;
  }
}

window.SyncEngine = SyncEngine;
