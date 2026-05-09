import React, { useState } from "react";

const Lobby = ({ onJoin }) => {
  const [name, setName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [roomName, setRoomName] = useState("");
  const [mode, setMode] = useState("home"); // 'home' | 'create' | 'join'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const createRoom = async () => {
    if (!name.trim()) return setError("Please enter your name");
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName || undefined, hostName: name }),
      });
      const data = await res.json();
      onJoin(data.roomId, name.trim());
    } catch (e) {
      setError("Failed to create room. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!name.trim()) return setError("Please enter your name");
    if (!roomId.trim()) return setError("Please enter a Room ID");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/rooms/${roomId.trim().toUpperCase()}`);
      if (!res.ok) {
        setError("Room not found. Check the Room ID.");
        setLoading(false);
        return;
      }
      onJoin(roomId.trim().toUpperCase(), name.trim());
    } catch (e) {
      setError("Failed to join room. Is the server running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lobby">
      <div className="lobby-card">
        <div className="logo">
          <span className="logo-icon">📡</span>
          <h1>MeetSpace</h1>
          <p>Video meetings, right inside your app</p>
        </div>

        {mode === "home" && (
          <div className="home-actions">
            <button className="primary-btn" onClick={() => setMode("create")}>
              ➕ Create New Meeting
            </button>
            <button className="secondary-btn" onClick={() => setMode("join")}>
              🔗 Join with Room ID
            </button>
          </div>
        )}

        {(mode === "create" || mode === "join") && (
          <div className="form-section">
            <button className="back-link" onClick={() => { setMode("home"); setError(""); }}>
              ← Back
            </button>

            <h2>{mode === "create" ? "Create Meeting" : "Join Meeting"}</h2>

            <div className="form-group">
              <label>Your Name *</label>
              <input
                className="input"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (mode === "create" ? createRoom() : joinRoom())}
              />
            </div>

            {mode === "create" && (
              <div className="form-group">
                <label>Room Name (optional)</label>
                <input
                  className="input"
                  placeholder="e.g. Team Standup"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                />
              </div>
            )}

            {mode === "join" && (
              <div className="form-group">
                <label>Room ID *</label>
                <input
                  className="input room-id-input"
                  placeholder="e.g. A1B2C3D4"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                  maxLength={8}
                />
              </div>
            )}

            {error && <div className="error-msg">⚠️ {error}</div>}

            <button
              className="primary-btn"
              onClick={mode === "create" ? createRoom : joinRoom}
              disabled={loading}
            >
              {loading ? "Connecting..." : mode === "create" ? "🚀 Start Meeting" : "▶ Join Meeting"}
            </button>
          </div>
        )}

        <div className="lobby-footer">
          <span>🔒 Peer-to-peer encrypted · No data leaves your server</span>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
