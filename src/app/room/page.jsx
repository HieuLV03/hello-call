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

      streamRef.current = stream;
      myVideo.current.srcObject = stream;

      // LOGIN + READY (QUAN TRỌNG)
      socket.on("connect", () => {
        socket.emit("login", { email: session.user.email });
        socket.emit("ready");
      });

      // MATCHED
      socket.on("matched", ({ partnerId, initiator }) => {
        console.log("MATCHED:", partnerId);

        if (peerRef.current) peerRef.current.destroy();

        const peer = new Peer({
          initiator,
          trickle: false,
          stream,
        });

        peer.on("signal", (data) => {
          socket.emit("signal", {
            to: partnerId,
            data,
          });
        });

        peer.on("stream", (remoteStream) => {
          userVideo.current.srcObject = remoteStream;
        });

        peerRef.current = peer;
      });

      // SIGNAL
      socket.on("signal", ({ data }) => {
        peerRef.current?.signal(data);
      });

      // DISCONNECT PARTNER
      socket.on("partner-disconnected", () => {
        console.log("Partner left");

        peerRef.current?.destroy();
        peerRef.current = null;

        userVideo.current.srcObject = null;

        // tự quay lại queue
        socket.emit("ready");
      });
    };

    start();

    return () => {
      socketRef.current?.disconnect();
      peerRef.current?.destroy();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [session]);

  const next = () => {
    peerRef.current?.destroy();
    peerRef.current = null;
    userVideo.current.srcObject = null;

    socketRef.current.emit("next");
  };

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center gap-5">
      <div className="flex gap-5">
        <video ref={myVideo} autoPlay muted playsInline className="w-[300px]" />
        <video ref={userVideo} autoPlay playsInline className="w-[300px]" />
      </div>

      <button
        onClick={next}
        className="bg-red-500 text-white px-6 py-3 rounded"
      >
        Next
      </button>
    </div>
  );
}