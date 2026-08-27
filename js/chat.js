/**
 * Watch Together by Likhon — Built-in Text Chat Drawer & Notification Sound
 * Handles messaging UI, unread badge counter, and Web Audio API synthesized chime.
 */

class ChatManager {
  constructor(syncEngine) {
    this.sync = syncEngine;
    this.unreadCount = 0;
    this.isOpen = false;
    this.nickname = 'Guest';

    // DOM Elements
    this.drawer = document.getElementById('chat-drawer');
    this.messageContainer = document.getElementById('chat-messages');
    this.chatInput = document.getElementById('chat-input');
    this.sendBtn = document.getElementById('chat-send-btn');
    this.toggleBtn = document.getElementById('chat-toggle-btn');
    this.unreadBadge = document.getElementById('chat-unread-badge');
    this.closeBtn = document.getElementById('chat-close-btn');

    this.init();
  }

  init() {
    // Generate or load nickname
    const savedName = localStorage.getItem('wt_username') || localStorage.getItem('wt_nickname');
    this.nickname = (this.sync && this.sync.getUsername) ? this.sync.getUsername() : (savedName || 'User_' + Math.floor(100 + Math.random() * 900));

    if (this.sendBtn && this.chatInput) {
      this.sendBtn.addEventListener('click', () => this.sendMessage());
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.sendMessage();
        }
      });
    }

    if (this.toggleBtn) {
      this.toggleBtn.addEventListener('click', () => this.toggleDrawer());
    }

    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.closeDrawer());
    }

    // Connect sync callback
    if (this.sync) {
      this.sync.onChatReceived = (msg) => this.handleIncomingMessage(msg);
    }

    // Connect mobile portrait chat input
    const mpSendBtn = document.getElementById('mp-chat-send');
    const mpInput = document.getElementById('mp-chat-input');
    if (mpSendBtn && mpInput) {
      const sendMobile = () => {
        const text = mpInput.value.trim();
        if (!text) return;
        if (this.sync) this.sync.sendChat(text, this.nickname);
        this.appendMessage({
          text: text,
          sender: this.nickname,
          timestamp: Date.now(),
          isMe: true
        });
        mpInput.value = '';
      };
      mpSendBtn.addEventListener('click', sendMobile);
      mpInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendMobile();
      });
    }

    // Connect desktop sidebar chat input
    const dtSendBtn = document.getElementById('desktop-chat-send');
    const dtInput = document.getElementById('desktop-chat-input');
    if (dtSendBtn && dtInput) {
      const sendDesktop = () => {
        const text = dtInput.value.trim();
        if (!text) return;
        if (this.sync) this.sync.sendChat(text, this.nickname);
        this.appendMessage({
          text: text,
          sender: this.nickname,
          timestamp: Date.now(),
          isMe: true
        });
        dtInput.value = '';
      };
      dtSendBtn.addEventListener('click', sendDesktop);
      dtInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') sendDesktop();
      });
    }
  }

  setNickname(name) {
    if (!name) return;
    this.nickname = name.trim();
    localStorage.setItem('wt_nickname', this.nickname);
  }

  sendMessage() {
    if (!this.chatInput) return;
    const text = this.chatInput.value.trim();
    if (!text) return;

    // Send via sync engine
    const msg = this.sync.sendChat(text, this.nickname);
    this.appendMessage({
      text: text,
      sender: this.nickname,
      timestamp: Date.now(),
      isMe: true
    });

    this.chatInput.value = '';
  }

  handleIncomingMessage(msg) {
    this.appendMessage({
      text: msg.text,
      sender: msg.sender || 'Peer',
      timestamp: msg.timestamp || Date.now(),
      isMe: false
    });

    if (!this.isOpen) {
      this.unreadCount++;
      this.updateBadge();
      this.playNotificationSound();
    }
  }

  appendMessage({ text, sender, timestamp, isMe }) {
    if (!this.messageContainer) return;

    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${isMe ? 'me' : 'peer'}`;

    bubble.innerHTML = `
      ${!isMe ? `<div class="chat-sender">${this._escapeHtml(sender)}</div>` : ''}
      <div class="chat-text">${this._escapeHtml(text)}</div>
      <div class="chat-time">${timeStr}</div>
    `;

    this.messageContainer.appendChild(bubble);
    this.messageContainer.scrollTop = this.messageContainer.scrollHeight;

    const mpStream = document.getElementById('mp-chat-stream');
    if (mpStream) {
      mpStream.appendChild(bubble.cloneNode(true));
      mpStream.scrollTop = mpStream.scrollHeight;
    }

    const dtStream = document.getElementById('desktop-chat-stream');
    if (dtStream) {
      dtStream.appendChild(bubble.cloneNode(true));
      dtStream.scrollTop = dtStream.scrollHeight;
    }
  }

  toggleDrawer() {
    if (this.isOpen) {
      this.closeDrawer();
    } else {
      this.openDrawer();
    }
  }

  openDrawer() {
    this.isOpen = true;
    if (this.drawer) this.drawer.classList.remove('closed');
    this.unreadCount = 0;
    this.updateBadge();
    if (this.chatInput) this.chatInput.focus();
  }

  closeDrawer() {
    this.isOpen = false;
    if (this.drawer) this.drawer.classList.add('closed');
  }

  updateBadge() {
    if (!this.unreadBadge) return;
    if (this.unreadCount > 0) {
      this.unreadBadge.innerText = this.unreadCount > 9 ? '9+' : this.unreadCount;
      this.unreadBadge.classList.add('active');
    } else {
      this.unreadBadge.classList.remove('active');
    }
  }

  /**
   * Synthesize a modern 2-tone chime using Web Audio API (Zero external MP3 files needed)
   */
  playNotificationSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      // Tone 1: 587.33Hz (D5) -> Tone 2: 880Hz (A5)
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.1);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.36);
    } catch (e) {
      console.warn('[Chat] Could not play notification audio:', e);
    }
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

window.ChatManager = ChatManager;
