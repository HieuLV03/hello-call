"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

const socket = io("https://hello-call-socket-production.up.railway.app", {
  transports: ["websocket"],
  autoConnect: false,
});

export default function Room() {
  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const peerRef = useRef(null);

  useEffect(() => {
    let stream;

    socket.connect();

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((mediaStream) => {
        stream = mediaStream;
        myVideo.current.srcObject = stream;

        // 🔥 JOIN ONLY ONCE
        socket.emit("join");

        // ================= MATCH =================
        socket.on("matched", (partnerId) => {
          if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
          }

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

          peer.on("stream", (remoteStream) => {
            userVideo.current.srcObject = remoteStream;
          });

          peer.on("error", (err) => {
            console.log("peer error:", err);
          });

          peerRef.current = peer;
        });

        // ================= SIGNAL =================
        socket.on("signal", ({ data }) => {
          try {
            if (!peerRef.current) return;
            peerRef.current.signal(data);
          } catch (e) {}
        });

        // ================= DISCONNECT =================
        socket.on("partner-disconnected", () => {
          peerRef.current?.destroy();
          peerRef.current = null;
          userVideo.current.srcObject = null;
        });
      });

    return () => {
      socket.emit("next");
      socket.disconnect();

      socket.off("matched");
      socket.off("signal");
      socket.off("partner-disconnected");
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