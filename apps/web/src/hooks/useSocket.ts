import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type { WallboardSnapshot } from "../types";

export type ConnectionState = "connecting" | "connected" | "disconnected";

export function useSocket() {
  const [snapshot, setSnapshot] = useState<WallboardSnapshot | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ["websocket", "polling"],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnectionState("connected"));
    socket.on("disconnect", () => setConnectionState("disconnected"));
    socket.on("connect_error", () => setConnectionState("disconnected"));
    socket.on("snapshot", (data: WallboardSnapshot) => setSnapshot(data));

    return () => { socket.disconnect(); };
  }, []);

  return { snapshot, connectionState };
}
