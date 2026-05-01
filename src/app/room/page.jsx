"use client";

import { useEffect, useRef } from "react";
import Peer from "simple-peer";
import { getSocket } from "../socket";

export default function Room() {
  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);

  const socket = getSocket();

  useEffect(() => {
    let stream;

    const start = async () => {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;
      myVideo.current.srcObject = stream;

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
          socket.emit("signal", { to: partnerId, data });
        });

        peer.on("stream", (remote) => {
          userVideo.current.srcObject = remote;
        });

        peerRef.current = peer;
      });

      socket.on("signal", ({ data }) => {
        peerRef.current?.signal(data);
      });

      socket.on("partner-disconnected", () => {
        peerRef.current?.destroy();
        peerRef.current = null;
        userVideo.current.srcObject = null;
      });
    };

    start();

    return () => {
      socket.emit("next");
      socket.off();
    };
  }, []);

  const next = () => {
    peerRef.current?.destroy();
    peerRef.current = null;
    userVideo.current.srcObject = null;

    socket.emit("next");
  };

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center gap-5">
      <div className="flex gap-5">
        <video ref={myVideo} autoPlay muted className="w-[300px]" />
        <video ref={userVideo} autoPlay className="w-[300px]" />
      </div>

      <button onClick={next} className="bg-white px-4 py-2">
        Next
      </button>
    </div>
  );
}