"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

const socket = io("https://hello-call-socket-production.up.railway.app", {
  transports: ["websocket"],
  forceNew: true,
});

export default function Home() {
  const myVideo = useRef(null);
  const userVideo = useRef(null);

  const peerRef = useRef(null);
  const pendingSignals = useRef([]);

  useEffect(() => {
    let stream;

    navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    }).then((mediaStream) => {
      stream = mediaStream;

      if (myVideo.current) {
        myVideo.current.srcObject = stream;
      }

      // ================= MATCH =================
      socket.on("matched", (partnerId) => {
        createPeer(partnerId, stream);
      });

      // ================= SIGNAL =================
      socket.on("signal", ({ data }) => {
        if (!peerRef.current) {
          pendingSignals.current.push(data);
          return;
        }

        try {
          peerRef.current.signal(data);
        } catch (err) {
          console.log("signal error:", err);
        }
      });

      // ================= DISCONNECT =================
      socket.on("partner-disconnected", () => {
        if (peerRef.current) {
          peerRef.current.destroy();
          peerRef.current = null;
        }

        pendingSignals.current = [];

        if (userVideo.current) {
          userVideo.current.srcObject = null;
        }
      });
    });

    return () => {
      socket.off("matched");
      socket.off("signal");
      socket.off("partner-disconnected");
    };
  }, []);

  // ================= CREATE PEER =================
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
      console.log("peer error:", err);
    });

    peerRef.current = peer;

    // 🔥 IMPORTANT FIX: flush async 1 tick
    setTimeout(() => {
      pendingSignals.current.forEach((s) => {
        try {
          peer.signal(s);
        } catch (e) {}
      });

      pendingSignals.current = [];
    }, 50);
  };

  // ================= NEXT =================
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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-5">
      <h1 className="text-white text-4xl font-bold">Hello Call</h1>

      <div className="flex gap-5">
        <video ref={myVideo} autoPlay muted playsInline className="w-[300px]" />
        <video ref={userVideo} autoPlay playsInline className="w-[300px]" />
      </div>

      <button onClick={nextUser} className="bg-white px-4 py-2">
        Next
      </button>
    </div>
  );
}