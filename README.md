# MeetSpace — In-App Video Meetings

Video/Audio meetings built with **Node.js**, **React.js**, and **WebRTC**. No third-party services needed — everything runs on your own server.

---

## 🗂️ Project Structure

```
meeting-app/
├── server/          # Node.js Backend (Socket.io Signaling)
│   ├── index.js
│   └── package.json
└── client/          # React.js Frontend
    ├── src/
    │   ├── App.js
    │   ├── App.css
    │   ├── index.js
    │   ├── components/
    │   │   ├── Lobby.js        ← Create/Join room screen
    │   │   ├── Room.js         ← Main meeting room
    │   │   ├── VideoTile.js    ← Single participant video
    │   │   ├── ChatPanel.js    ← In-room chat
    │   │   └── ControlBar.js   ← Mic/Cam/Screen controls
    │   ├── hooks/
    │   │   ├── useWebRTC.js    ← All WebRTC logic
    │   │   └── useChat.js      ← Chat messages
    │   └── context/
    │       └── SocketContext.js
    └── package.json
```

---

## ⚡ Quick Start

### 1. Install & Run the Backend

```bash
cd server
npm install
npm start
# Server runs on http://localhost:5000
```

### 2. Install & Run the Frontend

```bash
cd client
npm install
npm start
# App opens on http://localhost:3000
```

---

## ✅ Features

| Feature | Status |
|---|---|
| Video & Audio Calls | ✅ |
| Multiple Participants (P2P mesh) | ✅ |
| Mute / Unmute Mic | ✅ |
| Turn Camera On / Off | ✅ |
| Screen Sharing | ✅ |
| In-Room Text Chat | ✅ |
| Room ID Sharing | ✅ |
| Join/Leave Notifications | ✅ |
| No external services | ✅ |

---

## 🔧 Tech Stack

| Layer | Technology |
|---|---|
| Signaling | Socket.io (WebSocket) |
| P2P Transport | WebRTC via `simple-peer` |
| Backend | Node.js + Express |
| Frontend | React.js |
| Room state | In-memory (Node.js) |

---

## 🏗️ How It Works

```
User A  ──(1. join)──→  Signaling Server (Socket.io)  ←──(2. join)── User B
  │                                                                       │
  │  ←─────────────── (3. exchange SDP offer/answer) ──────────────────→ │
  │                                                                       │
  └──────────────── (4. WebRTC P2P Connection) ──────────────────────────┘
                    Audio / Video / Data flows directly
```

1. Both users connect to the Socket.io signaling server
2. They exchange WebRTC SDP offers/answers through the server
3. ICE candidates are exchanged to find the best network path
4. A direct P2P connection is established (video/audio never touches your server)

---

## 🚀 Production Deployment

### Add a TURN Server (needed when users are behind strict firewalls)

Install **coturn** on your server:
```bash
sudo apt-get install coturn
```

Configure `/etc/turnserver.conf` and update `ICE_SERVERS` in `useWebRTC.js`:
```js
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    {
      urls: "turn:your-server.com:3478",
      username: "your-username",
      credential: "your-password",
    },
  ],
};
```

### For Large Meetings (>6 people)

Replace `simple-peer` P2P mesh with **mediasoup** SFU:
- Install: `npm install mediasoup`
- Each user sends ONE stream to the server; server distributes to all others
- Much more scalable for large rooms

### Environment Variables (Production)

```bash
# server/.env
PORT=5000
CORS_ORIGIN=https://yourdomain.com
```

---

## ⚠️ Requirements

- **HTTPS is required in production** — WebRTC's `getUserMedia()` only works on secure origins
- For local development, `localhost` is allowed by browsers
- Node.js 16+
