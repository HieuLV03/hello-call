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
  "https://hello-call-socket-production.up.railway.app"
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

        // =========================
        // MATCHED
        // =========================

        socket.on("matched", ({ partnerId, initiator }) => {
          console.log("MATCHED:", partnerId);

          // destroy peer cũ
          if (peerRef.current) {
            try {
              peerRef.current.destroy();
            } catch {}
          }

          const peer = new Peer({
            initiator,
            trickle: true,
            stream,

            config: {
              iceServers: [
                {
                  urls: "stun:stun.l.google.com:19302",
                },

                {
                  urls: "turn:openrelay.metered.ca:80",
                  username: "openrelayproject",
                  credential: "openrelayproject",
                },

                {
                  urls: "turn:openrelay.metered.ca:443",
                  username: "openrelayproject",
                  credential: "openrelayproject",
                },

                {
                  urls:
                    "turn:openrelay.metered.ca:443?transport=tcp",
                  username: "openrelayproject",
                  credential: "openrelayproject",
                },
              ],
            },
          });

          // SEND SIGNAL
          peer.on("signal", (data) => {
            console.log("SEND SIGNAL");

            socket.emit("signal", {
              to: partnerId,
              data,
            });
          });

          // CONNECTED
          peer.on("connect", () => {
            console.log("PEER CONNECTED");
          });

          // REMOTE STREAM
          peer.on("stream", (remoteStream) => {
            console.log("REMOTE STREAM");

            if (userVideo.current) {
              userVideo.current.srcObject = remoteStream;

              userVideo.current
                .play()
                .catch(console.log);
            }
          });

          // ERROR
          peer.on("error", (err) => {
            console.log("PEER ERROR:", err);
          });

          // CLOSE
          peer.on("close", () => {
            console.log("PEER CLOSED");
          });

          peerRef.current = peer;
        });

        // =========================
        // RECEIVE SIGNAL
        // =========================

        socket.on("signal", ({ data }) => {
          console.log("RECEIVE SIGNAL");

          if (!peerRef.current) {
            console.log("NO PEER");
            return;
          }

          try {
            peerRef.current.signal(data);
          } catch (err) {
            console.log("SIGNAL ERROR", err);
          }
        });

        // =========================
        // PARTNER DISCONNECTED
        // =========================

        socket.on("partner-disconnected", () => {
          console.log("Partner disconnected");

          if (peerRef.current) {
            peerRef.current.destroy();
            peerRef.current = null;
          }

          if (userVideo.current) {
            userVideo.current.srcObject = null;
          }
        });

        // =========================
        // CONNECT
        // =========================

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

      if (peerRef.current) {
        peerRef.current.destroy();
      }

      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [session]);

  const next = () => {
    if (peerRef.current) {
      peerRef.current.destroy();
      peerRef.current = null;
    }

    if (userVideo.current) {
      userVideo.current.srcObject = null;
    }

    socketRef.current.emit("next");
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
        className="bg-red-500 text-white px-6 py-3 rounded"
      >
        Next
      </button>
    </div>
  );
}