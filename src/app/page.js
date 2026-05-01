"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="h-screen bg-black flex flex-col items-center justify-center gap-5">
      <h1 className="text-white text-4xl font-bold">
        Hello Call
      </h1>

      <button
        onClick={() => router.push("/room")}
        className="bg-white px-6 py-3 rounded-xl font-bold"
      >
        🎯 Match
      </button>
    </div>
  );
}