"use client";

import { useEffect, useRef } from "react";
import Peer from "simple-peer";
import { getSocket } from "../socket";

const socket = getSocket();

export default function Room() {
  const myVideo = useRef<HTMLVideoElement | null>(null);
  const userVideo = useRef<HTMLVideoElement | null>(null);

  const peerRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (!mounted) return;

      streamRef.current = stream;

      // ✅ FIX NULL SAFE
      if (myVideo.current) {
        myVideo.current.srcObject = stream;
      }

      if (!socket.connected) socket.connect();

      socket.emit("join");

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
        try {
          peerRef.current?.signal(data);
        } catch (e) {}
      });

      socket.on("partner-disconnected", () => {
        peerRef.current?.destroy();
        peerRef.current = null;

        if (userVideo.current) {
          userVideo.current.srcObject = null;
        }
      });
    };

    init();

    return () => {
      mounted = false;

      socket.emit("next");
      socket.off("matched");
      socket.off("signal");
      socket.off("partner-disconnected");
    };
  }, []);

  const next = () => {
    peerRef.current?.destroy();
    peerRef.current = null;

    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }

    socket.emit("next");
  };

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center">
      <div className="flex gap-5">
        <video ref={myVideo} autoPlay muted playsInline className="w-[300px]" />
        <video ref={userVideo} autoPlay playsInline className="w-[300px]" />
      </div>

      <button onClick={next} className="bg-white px-4 py-2 mt-5">
        Next
      </button>
    </div>
  );
}