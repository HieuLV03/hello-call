"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

const socket = io("https://hello-call-socket-production.up.railway.app", {
  transports: ["websocket"],
  autoConnect: false,
});

export default function Room() {
  const myVideo = useRef<HTMLVideoElement>(null);
  const userVideo = useRef<HTMLVideoElement>(null);

  const peerRef = useRef<Peer.Instance | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;

    const start = async () => {
      socket.connect();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      if (!mounted) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (myVideo.current) myVideo.current.srcObject = stream;

      socket.emit("join");

      // ================= MATCH =================
      socket.on("matched", (partnerId: string) => {
        console.log("MATCHED:", partnerId);

        if (peerRef.current) {
          peerRef.current.destroy();
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

        peer.on("stream", (remote) => {
          if (userVideo.current) userVideo.current.srcObject = remote;
        });

        peerRef.current = peer;
      });

      // ================= SIGNAL =================
      socket.on("signal", ({ from, data }) => {
        try {
          if (!peerRef.current) {
            // 👇 create only ONE peer here
            const peer = new Peer({
              initiator: false,
              trickle: false,
              stream: streamRef.current!,
            });

            peer.on("signal", (signalData) => {
              socket.emit("signal", {
                to: from,
                data: signalData,
              });
            });

            peer.on("stream", (remote) => {
              if (userVideo.current) {
                userVideo.current.srcObject = remote;
              }
            });

            peerRef.current = peer;
          }

          peerRef.current.signal(data);
        } catch (e) {
          console.log("signal error:", e);
        }
      });

      // ================= DISCONNECT =================
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

      socket.emit("next");
      socket.disconnect();

      socket.off("matched");
      socket.off("signal");
      socket.off("partner-disconnected");

      peerRef.current?.destroy();
      streamRef.current?.getTracks().forEach((t) => t.stop());
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