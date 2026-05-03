"use client";

import { useEffect, useRef } from "react";
import Peer from "simple-peer";
import { io } from "socket.io-client";
import { useSession } from "next-auth/react";

export default function Room() {
  const { data: session } = useSession();

  const myVideo = useRef(null);
  const userVideo = useRef(null);

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);

useEffect(() => {
  if (!session?.user?.email) return;

  const socket = io("https://hello-call-socket-production.up.railway.app", {
    transports: ["websocket"],
  });

  socketRef.current = socket;

const start = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });

  o.current = stream;
  r.current.srcObject = stream;

  l.emit("login", { email: e.user.email });

  // ✔ CHỈ READY SAU KHI STREAM OK
  setTimeout(() => {
    l.emit("ready");
  }, 300);

  l.on("matched", ({ partnerId, initiator }) => {
    if (i.current) i.current.destroy();

    const peer = new Peer({
      initiator,
      trickle: false,
      stream,
    });

    peer.on("signal", (data) => {
      l.emit("signal", { to: partnerId, data });
    });

    peer.on("stream", (remote) => {
      t.current.srcObject = remote;
    });

    i.current = peer;
  });
};

  start();

  return () => socket.disconnect();
}, [session]);
  const next = () => {
    peerRef.current?.destroy();
    peerRef.current = null;
    userVideo.current.srcObject = null;

    socketRef.current.emit("next");

    // quay lại queue
    socketRef.current.emit("ready");
  };

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center gap-5">
      <div className="flex gap-5">
        <video ref={myVideo} autoPlay muted playsInline className="w-[300px]" />
        <video ref={userVideo} autoPlay playsInline className="w-[300px]" />
      </div>

      <button onClick={next} className="bg-white text-black px-4 py-2 rounded">
        Next
      </button>
    </div>
  );
}