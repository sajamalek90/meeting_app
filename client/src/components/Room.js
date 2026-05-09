import React, { useState, useEffect } from "react";
import { useWebRTC } from "../hooks/useWebRTC";
import { useChat } from "../hooks/useChat";
import VideoTile from "./VideoTile";
import ControlBar from "./ControlBar";
import ChatPanel from "./ChatPanel";

const Room = ({ socket, roomId, userName, onLeave }) => {
  const [roomInfo, setRoomInfo] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [notification, setNotification] = useState("");

  const {
    peers,
    localStream,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  } = useWebRTC(socket, roomId, userName);

  const { messages, sendMessage } = useChat(socket, roomId, userName);

  // Fetch room info
  useEffect(() => {
    fetch(`/api/rooms/${roomId}`)
      .then((r) => r.json())
      .then(setRoomInfo)
      .catch(console.error);
  }, [roomId]);

  // Show join/leave notifications
  useEffect(() => {
    if (!socket) return;

    const showNotif = (msg) => {
      setNotification(msg);
      setTimeout(() => setNotification(""), 3000);
    };

    socket.on("user-joined", ({ participant }) =>
      showNotif(`${participant.name} joined the meeting`)
    );
    socket.on("user-left", ({ userName: leftName }) =>
      showNotif(`${leftName} left the meeting`)
    );

    return () => {
      socket.off("user-joined");
      socket.off("user-left");
    };
  }, [socket]);

  const peerList = Object.entries(peers);
  const totalParticipants = peerList.length + 1; // +1 for self

  // Grid layout based on participant count
  const getGridClass = () => {
    if (totalParticipants === 1) return "grid-1";
    if (totalParticipants === 2) return "grid-2";
    if (totalParticipants <= 4) return "grid-4";
    return "grid-many";
  };

  return (
    <div className="room-container">
      {/* Header */}
      <div className="room-header">
        <div className="room-title">
          <span className="live-dot" />
          <span>{roomInfo?.name || roomId}</span>
        </div>
        <div className="room-id-display">
          Room ID: <strong>{roomId}</strong>
          <button
            className="copy-btn"
            onClick={() => {
              navigator.clipboard.writeText(roomId);
              setNotification("Room ID copied!");
              setTimeout(() => setNotification(""), 2000);
            }}
          >
            📋
          </button>
        </div>
      </div>

      {/* Notification toast */}
      {notification && (
        <div className="notification-toast">{notification}</div>
      )}

      {/* Main area */}
      <div className={`room-main ${chatOpen ? "with-chat" : ""}`}>
        {/* Video grid */}
        <div className={`video-grid ${getGridClass()}`}>
          {/* Local video */}
          <VideoTile
            stream={localStream}
            name={userName}
            muted={true}
            audioEnabled={audioEnabled}
            videoEnabled={videoEnabled}
            isLocal={true}
          />

          {/* Remote peers */}
          {peerList.map(([socketId, peerData]) => (
            <VideoTile
              key={socketId}
              stream={peerData.stream}
              name={peerData.name}
              muted={false}
              audioEnabled={peerData.audio}
              videoEnabled={peerData.video}
              isLocal={false}
            />
          ))}

          {/* Empty state */}
          {peerList.length === 0 && (
            <div className="waiting-banner">
              <div className="waiting-icon">👋</div>
              <p>Waiting for others to join...</p>
              <p className="waiting-hint">Share the Room ID: <strong>{roomId}</strong></p>
            </div>
          )}
        </div>

        {/* Chat panel */}
        {chatOpen && (
          <ChatPanel
            messages={messages}
            onSend={sendMessage}
            currentUser={userName}
            onClose={() => setChatOpen(false)}
          />
        )}
      </div>

      {/* Control bar */}
      <ControlBar
        audioEnabled={audioEnabled}
        videoEnabled={videoEnabled}
        isScreenSharing={isScreenSharing}
        onToggleAudio={toggleAudio}
        onToggleVideo={toggleVideo}
        onStartScreen={startScreenShare}
        onStopScreen={stopScreenShare}
        onToggleChat={() => setChatOpen((o) => !o)}
        chatOpen={chatOpen}
        onLeave={onLeave}
        participantCount={totalParticipants}
      />
    </div>
  );
};

export default Room;
