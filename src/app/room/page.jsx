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
  const hasJoined = useRef(false);

  useEffect(() => {
    const socket = getSocket();
    socketRef.current = socket;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        streamRef.current = stream;

        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }

        // ⚠️ CHỈ CONNECT 1 LẦN
        if (!socket.connected) {
          socket.connect();
        }

        // ⚠️ CHỈ JOIN 1 LẦN
        if (!hasJoined.current) {
          socket.emit("join");
          hasJoined.current = true;
        }

        // cleanup listeners trước khi add lại
        socket.off("matched");
        socket.off("signal");
        socket.off("partner-disconnected");

        socket.on("matched", ({ partnerId, initiator }) => {
          console.log("MATCHED:", partnerId);

          if (peerRef.current) {
            peerRef.current.destroy();
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

          peer.on("error", (err) => {
            console.log("peer error:", err);
          });

          peerRef.current = peer;
        });

        socket.on("signal", ({ data }) => {
          peerRef.current?.signal(data);
        });

        socket.on("partner-disconnected", () => {
          console.log("partner left");

          peerRef.current?.destroy();
          peerRef.current = null;

          if (userVideo.current) {
            userVideo.current.srcObject = null;
          }
        });
      } catch (err) {
        console.log("camera error:", err);
      }
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

    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }

    socket.emit("next");

    // join lại queue
    socket.emit("join");
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