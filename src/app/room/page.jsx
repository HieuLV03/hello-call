"use client";

import { useEffect, useRef } from "react";
import Peer from "simple-peer";
import { io } from "socket.io-client";

export default function Room() {
  const myVideo = useRef(null);
  const userVideo = useRef(null);

  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    let mounted = true;

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

      if (myVideo.current) {
        myVideo.current.srcObject = stream;
      }

n.emit("join", { email: "user" });

      socket.on("matched", ({ partnerId, initiator }) => {
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
          if (userVideo.current) {
            userVideo.current.srcObject = remoteStream;
          }
        });

        peerRef.current = peer;
      });

      socket.on("signal", ({ data }) => {
        peerRef.current?.signal(data);
      });

      socket.on("partner-disconnected", () => {
        peerRef.current?.destroy();
        peerRef.current = null;

        if (userVideo.current) {
          userVideo.current.srcObject = null;
        }
      });
    };

    start();

    return () => {
      mounted = false;

      socket.disconnect();

      peerRef.current?.destroy();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const next = () => {
    peerRef.current?.destroy();
    peerRef.current = null;

    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }

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
        className="bg-white text-black px-4 py-2 rounded"
      >
        Next
      </button>
    </div>
  );
}