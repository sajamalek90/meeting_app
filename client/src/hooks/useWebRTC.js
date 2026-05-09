import { useEffect, useRef, useState, useCallback } from "react";
import SimplePeer from "simple-peer";

const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

export const useWebRTC = (socket, roomId, userName) => {
  const [peers, setPeers] = useState({}); // { socketId: { peer, stream, name, audio, video } }
  const [localStream, setLocalStream] = useState(null);
  const [screenStream, setScreenStream] = useState(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const peersRef = useRef({});
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // ─── Get local media ─────────────────────────────────────────────────────

  const getLocalStream = useCallback(async (video = true, audio = true) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("getUserMedia error:", err);
      // Try audio only if video fails
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        setLocalStream(stream);
        return stream;
      } catch (e) {
        console.error("Audio also failed:", e);
        return null;
      }
    }
  }, []);

  // ─── Create a peer connection ─────────────────────────────────────────────

  const createPeer = useCallback(
    (targetId, targetName, initiator, stream) => {
      const peer = new SimplePeer({
        initiator,
        trickle: true,
        stream: stream || undefined,
        config: ICE_SERVERS,
      });

      peer.on("signal", (signalData) => {
        if (signalData.type === "offer") {
          socket.emit("offer", { to: targetId, offer: signalData });
        } else if (signalData.type === "answer") {
          socket.emit("answer", { to: targetId, answer: signalData });
        } else {
          socket.emit("ice-candidate", { to: targetId, candidate: signalData });
        }
      });

      peer.on("stream", (remoteStream) => {
        setPeers((prev) => ({
          ...prev,
          [targetId]: { ...prev[targetId], stream: remoteStream },
        }));
      });

      peer.on("error", (err) => {
        console.error(`Peer error with ${targetId}:`, err);
        removePeer(targetId);
      });

      peer.on("close", () => removePeer(targetId));

      peersRef.current[targetId] = peer;
      setPeers((prev) => ({
        ...prev,
        [targetId]: {
          peer,
          stream: null,
          name: targetName,
          audio: true,
          video: true,
        },
      }));

      return peer;
    },
    [socket]
  );

  const removePeer = useCallback((socketId) => {
    if (peersRef.current[socketId]) {
      peersRef.current[socketId].destroy();
      delete peersRef.current[socketId];
    }
    setPeers((prev) => {
      const updated = { ...prev };
      delete updated[socketId];
      return updated;
    });
  }, []);

  // ─── Socket event handlers ────────────────────────────────────────────────

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleRoomJoined = async ({ participants }) => {
      const stream = await getLocalStream();
      // Create peer connections to all existing participants (we are initiator)
      participants.forEach(({ id, name }) => {
        createPeer(id, name, true, stream);
      });
    };

    const handleUserJoined = ({ participant }) => {
      // Someone new joined, they will send us an offer; just register the peer
      // We don't create peer here since we're not the initiator
      setPeers((prev) => ({
        ...prev,
        [participant.id]: {
          peer: null,
          stream: null,
          name: participant.name,
          audio: true,
          video: true,
        },
      }));
    };

    const handleOffer = ({ from, fromName, offer }) => {
      const stream = localStreamRef.current;
      const peer = createPeer(from, fromName, false, stream);
      peer.signal(offer);
    };

    const handleAnswer = ({ from, answer }) => {
      if (peersRef.current[from]) {
        peersRef.current[from].signal(answer);
      }
    };

    const handleIceCandidate = ({ from, candidate }) => {
      if (peersRef.current[from]) {
        peersRef.current[from].signal(candidate);
      }
    };

    const handleUserLeft = ({ userId, userName: leftName }) => {
      console.log(`${leftName} left`);
      removePeer(userId);
    };

    const handleMediaState = ({ userId, audio, video }) => {
      setPeers((prev) => ({
        ...prev,
        [userId]: { ...prev[userId], audio, video },
      }));
    };

    socket.on("room-joined", handleRoomJoined);
    socket.on("user-joined", handleUserJoined);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleIceCandidate);
    socket.on("user-left", handleUserLeft);
    socket.on("user-media-state", handleMediaState);

    // Join the room
    socket.emit("join-room", { roomId, userName });

    return () => {
      socket.off("room-joined", handleRoomJoined);
      socket.off("user-joined", handleUserJoined);
      socket.off("offer", handleOffer);
      socket.off("answer", handleAnswer);
      socket.off("ice-candidate", handleIceCandidate);
      socket.off("user-left", handleUserLeft);
      socket.off("user-media-state", handleMediaState);

      // Cleanup all peers and streams
      Object.values(peersRef.current).forEach((peer) => peer.destroy());
      peersRef.current = {};
      setPeers({});

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }
    };
  }, [socket, roomId, userName, createPeer, removePeer, getLocalStream]);

  // ─── Media controls ───────────────────────────────────────────────────────

  const toggleAudio = useCallback(() => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getAudioTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setAudioEnabled(track.enabled);
      socket.emit("media-state", {
        roomId,
        audio: track.enabled,
        video: videoEnabled,
      });
    }
  }, [socket, roomId, videoEnabled]);

  const toggleVideo = useCallback(() => {
    if (!localStreamRef.current) return;
    const track = localStreamRef.current.getVideoTracks()[0];
    if (track) {
      track.enabled = !track.enabled;
      setVideoEnabled(track.enabled);
      socket.emit("media-state", {
        roomId,
        audio: audioEnabled,
        video: track.enabled,
      });
    }
  }, [socket, roomId, audioEnabled]);

  // ─── Screen sharing ───────────────────────────────────────────────────────

  const startScreenShare = useCallback(async () => {
    try {
      const screenS = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });
      screenStreamRef.current = screenS;
      setScreenStream(screenS);

      const videoTrack = screenS.getVideoTracks()[0];

      // Replace video track in all peer connections
      Object.values(peersRef.current).forEach((peer) => {
        const sender = peer._pc
          ?.getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(videoTrack);
      });

      socket.emit("screen-share-start", { roomId });
      setIsScreenSharing(true);

      videoTrack.onended = () => stopScreenShare();
    } catch (err) {
      console.error("Screen share error:", err);
    }
  }, [socket, roomId]);

  const stopScreenShare = useCallback(async () => {
    if (!screenStreamRef.current) return;
    screenStreamRef.current.getTracks().forEach((t) => t.stop());

    // Restore camera track
    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    if (camTrack) {
      Object.values(peersRef.current).forEach((peer) => {
        const sender = peer._pc
          ?.getSenders()
          .find((s) => s.track?.kind === "video");
        if (sender) sender.replaceTrack(camTrack);
      });
    }

    socket.emit("screen-share-stop", { roomId });
    setIsScreenSharing(false);
    setScreenStream(null);
    screenStreamRef.current = null;
  }, [socket, roomId]);

  return {
    peers,
    localStream,
    screenStream,
    audioEnabled,
    videoEnabled,
    isScreenSharing,
    toggleAudio,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
  };
};
