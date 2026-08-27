"""
Watch Together by Likhon — Dedicated PotPlayer Synchronizer (Windows)
Enables 2 friends on Windows PCs to sync Daum PotPlayer playback in real-time
over the network with zero quality loss and full hardware HEVC/HDR support.
"""

import sys
import os
import time
import json
import socket
import threading
import ctypes
from ctypes import wintypes
import tkinter as tk
from tkinter import ttk, messagebox, filedialog

# Windows Constants for PotPlayer Remote SDK
WM_USER = 0x0400
POT_GET_TOTAL_TIME = 0x5002    # Total duration (ms)
POT_GET_CURRENT_TIME = 0x5004  # Current position (ms)
POT_SET_CURRENT_TIME = 0x5005  # Set position (lParam = ms)
POT_GET_PLAY_STATUS = 0x5006   # 0: Stopped, 1: Paused, 2: Running
POT_SET_PLAY_STATUS = 0x5007   # 0: Toggle, 1: Pause, 2: Play

user32 = ctypes.windll.user32

class PotPlayerBridge:
    def __init__(self):
        self.hwnd = None
        self.last_status = None
        self.last_time_ms = 0
        self.is_remote_action = False

    def find_potplayer(self):
        """Locate the active PotPlayer window handle"""
        hwnd = user32.FindWindowW("PotPlayer64", None)
        if not hwnd:
            hwnd = user32.FindWindowW("PotPlayer", None)
        self.hwnd = hwnd
        return hwnd

    def get_status(self):
        """0: Stopped, 1: Paused, 2: Running, -1: Not found"""
        if not self.find_potplayer():
            return -1
        return user32.SendMessageW(self.hwnd, WM_USER, POT_GET_PLAY_STATUS, 0)

    def get_current_time(self):
        """Returns playback time in milliseconds"""
        if not self.find_potplayer():
            return 0
        return user32.SendMessageW(self.hwnd, WM_USER, POT_GET_CURRENT_TIME, 0)

    def get_total_time(self):
        """Returns total video duration in milliseconds"""
        if not self.find_potplayer():
            return 0
        return user32.SendMessageW(self.hwnd, WM_USER, POT_GET_TOTAL_TIME, 0)

    def set_time(self, time_ms):
        """Seek to specific position in milliseconds"""
        if not self.find_potplayer():
            return
        self.is_remote_action = True
        user32.SendMessageW(self.hwnd, WM_USER, POT_SET_CURRENT_TIME, int(time_ms))
        time.sleep(0.15)
        self.is_remote_action = False

    def play(self):
        if not self.find_potplayer():
            return
        self.is_remote_action = True
        user32.SendMessageW(self.hwnd, WM_USER, POT_SET_PLAY_STATUS, 2)
        time.sleep(0.15)
        self.is_remote_action = False

    def pause(self):
        if not self.find_potplayer():
            return
        self.is_remote_action = True
        user32.SendMessageW(self.hwnd, WM_USER, POT_SET_PLAY_STATUS, 1)
        time.sleep(0.15)
        self.is_remote_action = False

    def toggle(self):
        if not self.find_potplayer():
            return
        self.is_remote_action = True
        user32.SendMessageW(self.hwnd, WM_USER, POT_SET_PLAY_STATUS, 0)
        time.sleep(0.15)
        self.is_remote_action = False


class PotPlayerSyncApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Watch Together (PotPlayer) — by Likhon")
        self.root.geometry("520x460")
        self.root.resizable(False, False)
        self.root.configure(bg="#0a0b10")

        self.bridge = PotPlayerBridge()
        self.sock = None
        self.client_conn = None
        self.is_host = False
        self.is_connected = False
        self.running = True

        self._setup_ui()
        self._start_poll_thread()

    def _setup_ui(self):
        # Header
        header_frame = tk.Frame(self.root, bg="#12141d", height=50)
        header_frame.pack(fill="x")
        
        lbl_title = tk.Label(header_frame, text="Watch Together for PotPlayer", font=("Segoe UI", 12, "bold"), fg="#f8fafc", bg="#12141d")
        lbl_title.pack(side="left", padx=16, pady=12)

        lbl_author = tk.Label(header_frame, text="by Likhon", font=("Segoe UI", 9, "bold"), fg="#06b6d4", bg="#12141d")
        lbl_author.pack(side="left", pady=12)

        self.lbl_pot_status = tk.Label(header_frame, text="● PotPlayer: Searching...", font=("Segoe UI", 8), fg="#f59e0b", bg="#12141d")
        self.lbl_pot_status.pack(side="right", padx=16)

        # Connection Box
        conn_frame = tk.LabelFrame(self.root, text=" Network Connection ", font=("Segoe UI", 9, "bold"), fg="#94a3b8", bg="#12141d", padx=12, pady=10)
        conn_frame.pack(fill="x", padx=16, pady=12)

        btn_row = tk.Frame(conn_frame, bg="#12141d")
        btn_row.pack(fill="x", pady=4)

        self.btn_host = tk.Button(btn_row, text="Host Room (Server)", bg="#6366f1", fg="white", font=("Segoe UI", 9, "bold"), relief="flat", padx=12, pady=5, command=self.start_host)
        self.btn_host.pack(side="left", padx=4)

        self.btn_join = tk.Button(btn_row, text="Join Friend's Room", bg="#1e293b", fg="white", font=("Segoe UI", 9), relief="flat", padx=12, pady=5, command=self.join_host)
        self.btn_join.pack(side="left", padx=4)

        ip_row = tk.Frame(conn_frame, bg="#12141d")
        ip_row.pack(fill="x", pady=6)

        tk.Label(ip_row, text="Host IP / Address:", font=("Segoe UI", 8), fg="#94a3b8", bg="#12141d").pack(side="left", padx=4)
        self.entry_ip = tk.Entry(ip_row, font=("Segoe UI", 9), bg="#0a0b10", fg="white", insertbackground="white", width=22)
        self.entry_ip.insert(0, "127.0.0.1")
        self.entry_ip.pack(side="left", padx=4)

        self.lbl_net_status = tk.Label(conn_frame, text="Status: Disconnected", font=("Segoe UI", 8), fg="#94a3b8", bg="#12141d")
        self.lbl_net_status.pack(anchor="w", pady=4)

        # Playback Status Box
        play_frame = tk.LabelFrame(self.root, text=" Synchronized Playback ", font=("Segoe UI", 9, "bold"), fg="#94a3b8", bg="#12141d", padx=12, pady=10)
        play_frame.pack(fill="both", expand=True, padx=16, pady=4)

        self.lbl_time = tk.Label(play_frame, text="00:00:00 / 00:00:00", font=("Consolas", 18, "bold"), fg="#f8fafc", bg="#12141d")
        self.lbl_time.pack(pady=8)

        self.lbl_state = tk.Label(play_frame, text="State: Stopped", font=("Segoe UI", 10), fg="#64748b", bg="#12141d")
        self.lbl_state.pack(pady=2)

        ctrl_row = tk.Frame(play_frame, bg="#12141d")
        ctrl_row.pack(pady=12)

        self.btn_play_pause = tk.Button(ctrl_row, text="▶ / ⏸ Play/Pause", bg="#10b981", fg="white", font=("Segoe UI", 9, "bold"), relief="flat", padx=16, pady=6, command=self.bridge.toggle)
        self.btn_play_pause.pack(side="left", padx=6)

        btn_seek_back = tk.Button(ctrl_row, text="⏪ -10s", bg="#1e293b", fg="white", font=("Segoe UI", 9), relief="flat", padx=10, pady=6, command=lambda: self._seek_relative(-10000))
        btn_seek_back.pack(side="left", padx=4)

        btn_seek_fwd = tk.Button(ctrl_row, text="+10s ⏩", bg="#1e293b", fg="white", font=("Segoe UI", 9), relief="flat", padx=10, pady=6, command=lambda: self._seek_relative(10000))
        btn_seek_fwd.pack(side="left", padx=4)

        # Footer
        footer = tk.Label(self.root, text="Make sure both users have the exact same movie file open in PotPlayer.", font=("Segoe UI", 7), fg="#475569", bg="#0a0b10")
        footer.pack(side="bottom", pady=6)

    def _seek_relative(self, delta_ms):
        cur = self.bridge.get_current_time()
        self.bridge.set_time(max(0, cur + delta_ms))

    def _format_time(self, ms):
        seconds = ms // 1000
        hrs = seconds // 3600
        mins = (seconds % 3600) // 60
        secs = seconds % 60
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"

    def start_host(self):
        self.is_host = True
        self.btn_host.config(state="disabled")
        self.btn_join.config(state="disabled")
        self.lbl_net_status.config(text="Status: Hosting on port 9090 (Waiting for friend...)", fg="#f59e0b")

        threading.Thread(target=self._host_server_thread, daemon=True).start()

    def _host_server_thread(self):
        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            server.bind(("0.0.0.0", 9090))
            server.listen(1)
            conn, addr = server.accept()
            self.client_conn = conn
            self.is_connected = True
            self.lbl_net_status.config(text=f"Status: Connected with friend ({addr[0]})", fg="#10b981")
            
            # Start listener
            self._listen_messages(conn)
        except Exception as e:
            self.lbl_net_status.config(text=f"Server error: {e}", fg="#ef4444")
        finally:
            server.close()

    def join_host(self):
        host_ip = self.entry_ip.get().strip()
        if not host_ip:
            messagebox.showerror("Error", "Please enter Host IP.")
            return

        self.btn_host.config(state="disabled")
        self.btn_join.config(state="disabled")
        self.lbl_net_status.config(text=f"Connecting to {host_ip}:9090...", fg="#f59e0b")

        threading.Thread(target=self._join_client_thread, args=(host_ip,), daemon=True).start()

    def _join_client_thread(self, host_ip):
        client = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        try:
            client.connect((host_ip, 9090))
            self.client_conn = client
            self.is_connected = True
            self.lbl_net_status.config(text=f"Status: Connected to Host ({host_ip})", fg="#10b981")
            self._listen_messages(client)
        except Exception as e:
            self.lbl_net_status.config(text=f"Connection failed: {e}", fg="#ef4444")
            self.btn_host.config(state="normal")
            self.btn_join.config(state="normal")

    def _send_sync(self, action_type, time_ms):
        if not self.is_connected or not self.client_conn:
            return
        payload = json.dumps({"action": action_type, "time_ms": time_ms}) + "\n"
        try:
            self.client_conn.sendall(payload.encode())
        except Exception as e:
            print("Send error:", e)

    def _listen_messages(self, conn):
        buffer = ""
        while self.running:
            try:
                data = conn.recv(1024).decode()
                if not data:
                    break
                buffer += data
                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    if line.strip():
                        msg = json.loads(line)
                        self._handle_remote_action(msg)
            except Exception:
                break
        self.is_connected = False
        self.lbl_net_status.config(text="Status: Connection closed", fg="#ef4444")

    def _handle_remote_action(self, msg):
        action = msg.get("action")
        time_ms = msg.get("time_ms", 0)

        if action == "play":
            self.bridge.set_time(time_ms)
            self.bridge.play()
        elif action == "pause":
            self.bridge.set_time(time_ms)
            self.bridge.pause()
        elif action == "seek":
            self.bridge.set_time(time_ms)
        elif action == "heartbeat":
            cur = self.bridge.get_current_time()
            drift = abs(cur - time_ms)
            if drift > 600:  # > 0.6 seconds drift
                self.bridge.set_time(time_ms)

    def _start_poll_thread(self):
        def poll():
            last_status = None
            last_time = 0
            while self.running:
                time.sleep(0.25)
                hwnd = self.bridge.find_potplayer()
                if not hwnd:
                    self.lbl_pot_status.config(text="● PotPlayer: Not Found", fg="#ef4444")
                    continue

                self.lbl_pot_status.config(text=f"● PotPlayer: Active (HWND {hwnd})", fg="#10b981")
                status = self.bridge.get_status()
                cur_time = self.bridge.get_current_time()
                tot_time = self.bridge.get_total_time()

                # Update UI
                self.lbl_time.config(text=f"{self._format_time(cur_time)} / {self._format_time(tot_time)}")
                state_text = {0: "Stopped", 1: "Paused", 2: "Playing"}.get(status, "Unknown")
                self.lbl_state.config(text=f"State: {state_text}")

                # Detect user local actions and broadcast
                if not self.bridge.is_remote_action and self.is_connected:
                    if last_status is not None and status != last_status:
                        if status == 2:  # Started playing
                            self._send_sync("play", cur_time)
                        elif status == 1:  # Paused
                            self._send_sync("pause", cur_time)

                    # Detect seek (sudden jump > 2.5 seconds difference from expected)
                    if last_time > 0 and abs(cur_time - (last_time + 250)) > 2500:
                        self._send_sync("seek", cur_time)

                last_status = status
                last_time = cur_time

        threading.Thread(target=poll, daemon=True).start()

    def on_close(self):
        self.running = False
        if self.client_conn:
            try:
                self.client_conn.close()
            except Exception:
                pass
        self.root.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = PotPlayerSyncApp(root)
    root.protocol("WM_DELETE_WINDOW", app.on_close)
    root.mainloop()
