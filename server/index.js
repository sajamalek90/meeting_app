const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// In-memory store for rooms
const rooms = {};

// ─── REST API ───────────────────────────────────────────────────────────────

// Create a new room
app.post("/api/rooms", (req, res) => {
  const { name, hostName } = req.body;
  const roomId = uuidv4().slice(0, 8).toUpperCase();
  rooms[roomId] = {
    id: roomId,
    name: name || `Room ${roomId}`,
    host: hostName || "Anonymous",
    createdAt: new Date(),
    participants: [],
  };
  console.log(`[Room Created] ${roomId} by ${hostName}`);
  res.json({ roomId, room: rooms[roomId] });
});

// Get room info
app.get("/api/rooms/:roomId", (req, res) => {
  const room = rooms[req.params.roomId];
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json(room);
});

// List all active rooms
app.get("/api/rooms", (req, res) => {
  const activeRooms = Object.values(rooms).filter(
    (r) => r.participants.length > 0
  );
  res.json(activeRooms);
});

// ─── SOCKET.IO SIGNALING ────────────────────────────────────────────────────

io.on("connection", (socket) => {
  console.log(`[Connected] Socket: ${socket.id}`);

  // Join a room
  socket.on("join-room", ({ roomId, userName }) => {
    const room = rooms[roomId];
    if (!room) {
      socket.emit("error", { message: "Room not found" });
      return;
    }

    socket.join(roomId);
    socket.roomId = roomId;
    socket.userName = userName;

    // Add participant
    const participant = { id: socket.id, name: userName, joinedAt: new Date() };
    room.participants.push(participant);

    // Tell the new user about everyone already in the room
    const others = room.participants.filter((p) => p.id !== socket.id);
    socket.emit("room-joined", { room, participants: others });

    // Tell everyone else that a new user joined
    socket.to(roomId).emit("user-joined", { participant });

    console.log(`[Joined] ${userName} joined room ${roomId}`);
  });

  // ─── WebRTC Signaling ───────────────────────────────────────────────────

  // Forward WebRTC offer to a specific peer
  socket.on("offer", ({ to, offer }) => {
    io.to(to).emit("offer", {
      from: socket.id,
      fromName: socket.userName,
      offer,
    });
  });

  // Forward WebRTC answer to a specific peer
  socket.on("answer", ({ to, answer }) => {
    io.to(to).emit("answer", {
      from: socket.id,
      answer,
    });
  });

  // Forward ICE candidates to a specific peer
  socket.on("ice-candidate", ({ to, candidate }) => {
    io.to(to).emit("ice-candidate", {
      from: socket.id,
      candidate,
    });
  });

  // ─── In-Room Events ─────────────────────────────────────────────────────

  // Chat message
  socket.on("chat-message", ({ roomId, message }) => {
    const payload = {
      id: uuidv4(),
      sender: socket.userName,
      senderId: socket.id,
      message,
      timestamp: new Date(),
    };
    io.to(roomId).emit("chat-message", payload);
  });

  // Media state change (mute/unmute, cam on/off)
  socket.on("media-state", ({ roomId, audio, video }) => {
    socket.to(roomId).emit("user-media-state", {
      userId: socket.id,
      audio,
      video,
    });
  });

  // Screen sharing started
  socket.on("screen-share-start", ({ roomId }) => {
    socket.to(roomId).emit("user-screen-share", {
      userId: socket.id,
      userName: socket.userName,
      sharing: true,
    });
  });

  // Screen sharing stopped
  socket.on("screen-share-stop", ({ roomId }) => {
    socket.to(roomId).emit("user-screen-share", {
      userId: socket.id,
      userName: socket.userName,
      sharing: false,
    });
  });

  // ─── Disconnect ─────────────────────────────────────────────────────────

  socket.on("disconnect", () => {
    const { roomId, userName } = socket;
    if (roomId && rooms[roomId]) {
      rooms[roomId].participants = rooms[roomId].participants.filter(
        (p) => p.id !== socket.id
      );
      socket.to(roomId).emit("user-left", {
        userId: socket.id,
        userName,
      });

      // Clean up empty rooms after 5 minutes
      if (rooms[roomId].participants.length === 0) {
        setTimeout(() => {
          if (rooms[roomId] && rooms[roomId].participants.length === 0) {
            delete rooms[roomId];
            console.log(`[Room Deleted] ${roomId} - empty`);
          }
        }, 5 * 60 * 1000);
      }
    }
    console.log(`[Disconnected] ${userName || socket.id}`);
  });
});

// ─── Start Server ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`\n🚀 Meeting Server running on http://localhost:${PORT}\n`);
});
