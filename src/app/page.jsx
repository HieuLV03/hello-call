"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="h-screen bg-black text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center gap-5">
      <h1 className="text-white text-4xl">Hello Call</h1>

      {!session ? (
        <button onClick={() => signIn("google")} className="bg-white px-6 py-3">
          Login Google
        </button>
      ) : (
        <>
          <p className="text-white">Hi {session.user.name}</p>

          <button
            onClick={() => router.push("/room")}
            className="bg-green-500 px-6 py-3"
          >
            🎯 Match
          </button>

          <button onClick={() => signOut()} className="text-red-500">
            Logout
          </button>
        </>
      )}
    </div>
  );
}