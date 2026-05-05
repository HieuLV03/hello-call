"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

export default function Home() {
  const { data: session, status } = useSession();

  const router = useRouter();

  const [onlineUsers, setOnlineUsers] = useState(0);

  useEffect(() => {
    const socket = io(
      "https://hello-call-socket-production.up.railway.app"
    );

    socket.on("online-users", (count) => {
      setOnlineUsers(count);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center gap-5">
      <h1 className="text-white text-4xl font-bold">
        Hello Call
      </h1>

      {/* ONLINE USERS */}
      <div className="text-green-400 text-lg">
        🟢 Online: {onlineUsers}
      </div>

      {!session ? (
        <button
          onClick={() => signIn("google")}
          className="bg-white px-6 py-3 rounded-xl"
        >
          Login Google
        </button>
      ) : (
        <>
          <p className="text-white">
            Hi {session.user.name}
          </p>

          <button
            onClick={() => router.push("/room")}
            className="bg-green-500 text-white px-6 py-3 rounded-xl"
          >
            🎯 Match
          </button>

          <button
            onClick={() => signOut()}
            className="text-red-500"
          >
            Logout
          </button>
        </>
      )}
    </div>
  );
}