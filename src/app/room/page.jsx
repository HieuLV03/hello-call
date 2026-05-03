"use client";

import { useEffect, useRef } from "react";
import Peer from "simple-peer";
import { getSocket } from "../socket";

export default function Room() {
  const myVideo = useRef(null);
  const userVideo = useRef(null);

  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();
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

      if (!socket.connected) socket.connect();

      socket.emit("join");

      socket.off("matched");
      socket.off("signal");
      socket.off("partner-disconnected");

      socket.on("matched", ({ partnerId, initiator }) => {
        if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
        }

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
      socket.off("matched");
      socket.off("signal");
      socket.off("partner-disconnected");

      peerRef.current?.destroy();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const next = () => {
    const socket = socketRef.current;
    if (!socket) return;

    peerRef.current?.destroy();
    peerRef.current = null;

    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }

    socket.emit("next");
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