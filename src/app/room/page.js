"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import { getSocket } from "../socket";


const socket = getSocket();
export default function Room() {
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);

  const peerRef = useRef<Peer.Instance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

 useEffect(() => {
  let stream;

  const socket = getSocket();

  if (!socket.connected) {
    socket.connect();
  }

  navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  }).then((mediaStream) => {
    stream = mediaStream;
    myVideo.current.srcObject = stream;

    socket.off(); // 🔥 chặn duplicate listener

    socket.emit("join");

    socket.on("matched", (partnerId) => {
      console.log("matched:", partnerId);
    });

    socket.on("signal", ({ data }) => {
      peerRef.current?.signal(data);
    });

    socket.on("partner-disconnected", () => {
      peerRef.current?.destroy();
      peerRef.current = null;
    });
  });

  return () => {
    socket.emit("next");
    socket.off();
  };
}, []);
  const handleNext = () => {
    peerRef.current?.destroy();
    peerRef.current = null;

    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }

    socket.emit("next");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center">
      <div className="flex gap-5">
        <video ref={myVideo} autoPlay muted playsInline className="w-[300px]" />
        <video ref={userVideo} autoPlay playsInline className="w-[300px]" />
      </div>

      <button
        onClick={handleNext}
        className="mt-10 bg-white px-6 py-3"
      >
        Next
      </button>
    </div>
  );
}