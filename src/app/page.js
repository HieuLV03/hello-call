"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

const socket = io("https://hello-call-socket-production.up.railway.app");

export default function Home() {
  const myVideo = useRef(null);
  const userVideo = useRef(null);

  const peerRef = useRef(null);
  const pendingSignals = useRef([]);

  useEffect(() => {
    let streamRef;

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        streamRef = stream;

        if (myVideo.current) {
          myVideo.current.srcObject = stream;
        }

        const handleMatched = (partnerId) => {
          createPeer(partnerId, stream);
        };

        const handleSignal = ({ data }) => {
          if (!peerRef.current) {
            pendingSignals.current.push(data);
            return;
          }

          if (peerRef.current.destroyed) return;

          try {
            peerRef.current.signal(data);
          } catch (err) {
            console.error("signal error:", err);
          }
        };

        const handleDisconnect = () => {
          if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
          }

          pendingSignals.current = [];

          if (userVideo.current) {
            userVideo.current.srcObject = null;
          }
        };

        socket.off("matched");
        socket.off("signal");
        socket.off("partner-disconnected");

        socket.on("matched", handleMatched);
        socket.on("signal", handleSignal);
        socket.on("partner-disconnected", handleDisconnect);
      });

    return () => {
      socket.off("matched");
      socket.off("signal");
      socket.off("partner-disconnected");
    };
  }, []);

  const createPeer = (partnerId, stream) => {
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

    peer.on("stream", (remoteStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = remoteStream;
      }
    });

    peer.on("error", (err) => {
      console.error("peer error:", err);
    });

    peerRef.current = peer;

    // 🔥 flush pending signals
    pendingSignals.current.forEach((sig) => {
      try {
        peer.signal(sig);
      } catch (e) {
        console.warn("pending signal error:", e);
      }
    });

    pendingSignals.current = [];
  };

  const nextUser = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    pendingSignals.current = [];

    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }

    socket.emit("next");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-5 p-5">
      <h1 className="text-white text-4xl font-bold">Hello Call</h1>

      <div className="flex gap-5 flex-wrap justify-center">
        <video
          ref={myVideo}
          autoPlay
          muted
          playsInline
          className="w-[350px] rounded-2xl border border-white"
        />

        <video
          ref={userVideo}
          autoPlay
          playsInline
          className="w-[350px] rounded-2xl border border-white"
        />
      </div>

      <button
        onClick={nextUser}
        className="bg-white text-black px-6 py-3 rounded-xl font-bold"
      >
        Next
      </button>
    </div>
  );
}