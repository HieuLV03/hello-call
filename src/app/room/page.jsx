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
    let mounted = true;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!mounted) return;

        streamRef.current = stream;

        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }

        if (!socket.connected) {
          socket.connect();
        }

        socket.emit("join");

        socket.on("matched", ({ partnerId, initiator }) => {
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

          peer.on("close", () => {
            peer.destroy();
          });

          peer.on("error", (err) => {
            console.log(err);
          });

          peerRef.current = peer;
        });

        socket.on("signal", ({ data }) => {
          if (peerRef.current) {
            peerRef.current.signal(data);
          }
        });

        socket.on("partner-disconnected", () => {
          if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
          }

          if (userVideo.current) {
            userVideo.current.srcObject = null;
          }
        });
      } catch (err) {
        console.log(err);
      }
    };

    start();

    return () => {
      mounted = false;

      socket.off("matched");
      socket.off("signal");
      socket.off("partner-disconnected");

      peerRef.current?.destroy();

      streamRef.current?.getTracks().forEach((track) => {
        track.stop();
      });
    };
  }, []);

  const next = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }

    socket.emit("next");
  };

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center gap-5">
      <div className="flex gap-5">
        <video
          ref={myVideo}
          autoPlay
          muted
          playsInline
          className="w-[300px]"
        />

        <video
          ref={userVideo}
          autoPlay
          playsInline
          className="w-[300px]"
        />
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