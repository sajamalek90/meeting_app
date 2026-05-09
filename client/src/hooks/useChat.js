import { useState, useEffect, useCallback } from "react";

export const useChat = (socket, roomId, userName) => {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("chat-message", handleMessage);
    return () => socket.off("chat-message", handleMessage);
  }, [socket]);

  const sendMessage = useCallback(
    (text) => {
      if (!text.trim() || !socket) return;
      socket.emit("chat-message", { roomId, message: text.trim() });
    },
    [socket, roomId]
  );

  return { messages, sendMessage };
};
