"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const socket = io("https://hello-call-socket-production.up.railway.app", {
  transports: ["websocket"],
  autoConnect: false, // 🔥 quan trọng
});

export default function Room() {
  const router = useRouter();

  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const peerRef = useRef(null);

  useEffect(() => {
    let stream;

    // 🔥 connect SOCKET khi vào room
    socket.connect();

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((mediaStream) => {
        stream = mediaStream;
        myVideo.current.srcObject = stream;

        // join queue
        socket.emit("join");

        socket.on("matched", (partnerId) => {
          const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
          });

          peer.on("signal", (data) => {
            socket.emit("signal", {
              to: partnerId,
              data,
            });
          });

          peer.on("stream", (remote) => {
            userVideo.current.srcObject = remote;
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
          userVideo.current.srcObject = null;
        });
      });

    return () => {
      socket.emit("leave");
      socket.disconnect();
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

      <button onClick={() => router.push("/")} className="text-red-500">
        Thoát
      </button>
    </div>
  );
}