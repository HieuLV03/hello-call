"use client";

import { useEffect, useRef } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";

const socket = io("http://192.168.1.106:3001");
export default function Home() {
  const myVideo = useRef();
  const userVideo = useRef();

  const peerRef = useRef();

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then((stream) => {
        myVideo.current.srcObject = stream;

        socket.on("matched", (partnerId) => {
          createPeer(partnerId, stream);
        });

        socket.on("signal", ({ from, data }) => {
          if (peerRef.current) {
            peerRef.current.signal(data);
          } else {
            answerPeer(from, data, stream);
          }
        });

        socket.on("partner-disconnected", () => {
          if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
          }

          userVideo.current.srcObject = null;
        });
      });
  }, []);

  const createPeer = (partnerId, stream) => {
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

    peerRef.current = peer;
  };

  const answerPeer = (partnerId, signal, stream) => {
    const peer = new Peer({
      initiator: false,
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

    peer.signal(signal);

    peerRef.current = peer;
  };

  const nextUser = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    userVideo.current.srcObject = null;

    socket.emit("next");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-5 p-5">
      <h1 className="text-white text-4xl font-bold">
        Hello Call
      </h1>

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