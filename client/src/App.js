import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import Lobby from "./components/Lobby";
import Room from "./components/Room";
import "./App.css";

function App() {
  const [page, setPage] = useState("lobby"); // 'lobby' | 'room'
  const [roomId, setRoomId] = useState(null);
  const [userName, setUserName] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = io("http://localhost:5000", { transports: ["websocket"] });
    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  const handleJoin = (id, name) => {
    setRoomId(id);
    setUserName(name);
    setPage("room");
  };

  const handleLeave = () => {
    // Reconnect socket for a fresh session
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current.connect();
    }
    setPage("lobby");
    setRoomId(null);
    setUserName(null);
  };

  return (
    <div className="app">
      {page === "lobby" && <Lobby onJoin={handleJoin} />}
      {page === "room" && roomId && (
        <Room
          socket={socketRef.current}
          roomId={roomId}
          userName={userName}
          onLeave={handleLeave}
        />
      )}
    </div>
  );
}

export default App;
