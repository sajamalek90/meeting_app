import React from "react";

const ControlBar = ({
  audioEnabled,
  videoEnabled,
  isScreenSharing,
  onToggleAudio,
  onToggleVideo,
  onStartScreen,
  onStopScreen,
  onToggleChat,
  chatOpen,
  onLeave,
  participantCount,
}) => {
  return (
    <div className="control-bar">
      <div className="control-info">
        <span className="participant-badge">👥 {participantCount}</span>
      </div>

      <div className="controls-center">
        <button
          className={`ctrl-btn ${!audioEnabled ? "active-red" : ""}`}
          onClick={onToggleAudio}
          title={audioEnabled ? "Mute" : "Unmute"}
        >
          {audioEnabled ? "🎙️" : "🔇"}
          <span>{audioEnabled ? "Mute" : "Unmute"}</span>
        </button>

        <button
          className={`ctrl-btn ${!videoEnabled ? "active-red" : ""}`}
          onClick={onToggleVideo}
          title={videoEnabled ? "Stop Camera" : "Start Camera"}
        >
          {videoEnabled ? "📹" : "📷"}
          <span>{videoEnabled ? "Camera" : "No Cam"}</span>
        </button>

        <button
          className={`ctrl-btn ${isScreenSharing ? "active-green" : ""}`}
          onClick={isScreenSharing ? onStopScreen : onStartScreen}
          title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
        >
          🖥️
          <span>{isScreenSharing ? "Stop Share" : "Share"}</span>
        </button>

        <button
          className={`ctrl-btn ${chatOpen ? "active-blue" : ""}`}
          onClick={onToggleChat}
          title="Toggle Chat"
        >
          💬
          <span>Chat</span>
        </button>
      </div>

      <div className="controls-right">
        <button className="ctrl-btn leave-btn" onClick={onLeave}>
          📴 Leave
        </button>
      </div>
    </div>
  );
};

export default ControlBar;
