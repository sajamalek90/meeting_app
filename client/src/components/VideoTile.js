import React, { useEffect, useRef } from "react";

const VideoTile = ({ stream, name, muted = false, audioEnabled = true, videoEnabled = true, isLocal = false }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return (
    <div className="video-tile">
      {stream && videoEnabled ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={muted}
          className="video-el"
        />
      ) : (
        <div className="video-placeholder">
          <div className="avatar-initials">{initials}</div>
        </div>
      )}

      <div className="tile-overlay">
        <span className="participant-name">
          {name} {isLocal && "(You)"}
        </span>
        <div className="media-indicators">
          {!audioEnabled && (
            <span className="indicator muted" title="Muted">🔇</span>
          )}
          {!videoEnabled && (
            <span className="indicator no-video" title="Camera Off">📷</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoTile;
