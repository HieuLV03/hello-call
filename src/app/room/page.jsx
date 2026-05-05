"use client";

import { useEffect, useRef } from "react";
import Peer from "simple-peer";
import { io } from "socket.io-client";
import { useSession } from "next-auth/react";

export default function Room() {
  const { data: session } = useSession();

  const myVideo = useRef(null);
  const userVideo = useRef(null);
  const socketRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
useEffect(() => {
  if (!session?.user?.email) return;

  const socket = io(
    "https://hello-call-socket-production.up.railway.app",
    {
      transports: ["websocket"],
    }
  );

  socketRef.current = socket;

  let stream;

  const init = async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      streamRef.current = stream;

      if (myVideo.current) {
        myVideo.current.srcObject = stream;
      }

      // ===== LISTENERS TRƯỚC =====

      socket.on("matched", ({ partnerId, initiator }) => {
        console.log("MATCHED:", partnerId);

        peerRef.current?.destroy();

  const peer = new Peer({
  initiator,
  trickle: false,
  stream,

  config: {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
      {
        urls: "stun:global.stun.twilio.com:3478",
      },
    ],
  },
});

        peer.on("signal", (data) => {
          socket.emit("signal", {
            to: partnerId,
            data,
          });
        });

        peer.on("stream", (remoteStream) => {
          console.log("REMOTE STREAM");

          if (userVideo.current) {
            userVideo.current.srcObject = remoteStream;
          }
        });

        peer.on("error", (err) => {
          console.log("PEER ERROR:", err);
        });

        peer.on("close", () => {
          console.log("PEER CLOSED");
        });

        peerRef.current = peer;
      });

      socket.on("signal", ({ data }) => {
        console.log("SIGNAL");

        peerRef.current?.signal(data);
      });

      socket.on("partner-disconnected", () => {
        console.log("Partner disconnected");

        peerRef.current?.destroy();
        peerRef.current = null;

        if (userVideo.current) {
          userVideo.current.srcObject = null;
        }

        socket.emit("ready");
      });

      // ===== CONNECT SAU CÙNG =====

      socket.on("connect", () => {
        console.log("CONNECTED:", socket.id);

        socket.emit("login", {
          email: session.user.email,
        });

        socket.emit("ready");
      });
    } catch (err) {
      console.log(err);
    }
  };

  init();

  return () => {
    socket.disconnect();

    peerRef.current?.destroy();

    stream?.getTracks().forEach((t) => t.stop());
  };
}, [session]);
  const next = () => {
    peerRef.current?.destroy();
    peerRef.current = null;
    userVideo.current.srcObject = null;

    socketRef.current.emit("next");
  };

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center gap-5">
      <div className="flex gap-5">
        <video ref={myVideo} autoPlay muted playsInline className="w-[300px]" />
        <video ref={userVideo} autoPlay playsInline className="w-[300px]" />
      </div>

      <button
        onClick={next}
        className="bg-red-500 text-white px-6 py-3 rounded"
      >
        Next
      </button>
    </div>
  );
}