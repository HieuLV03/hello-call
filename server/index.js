const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// =========================
// STATE
// =========================

let queue = [];
const partners = new Map();
const readyUsers = new Set();

// 👉 FIX ONLINE USERS (QUAN TRỌNG)
const onlineSockets = new Set();

// =========================
// ONLINE USERS
// =========================

function emitOnlineUsers() {
  const count = onlineSockets.size;

  console.log("🟢 ONLINE:", count);

  io.emit("online-users", count);
}

// =========================
// HELPERS
// =========================

function removeFromQueue(id) {
  queue = queue.filter((x) => x !== id);
}

function addToQueue(id) {
  removeFromQueue(id);

  if (!queue.includes(id)) {
    queue.push(id);
  }
}

// =========================
// MATCH SYSTEM
// =========================

function tryMatch() {
  queue = queue.filter(
    (id) => readyUsers.has(id) && !partners.has(id)
  );

  console.log("QUEUE:", queue);

  while (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();

    if (!a || !b || a === b) continue;

    readyUsers.delete(a);
    readyUsers.delete(b);

    partners.set(a, b);
    partners.set(b, a);

    io.to(a).emit("matched", {
      partnerId: b,
      initiator: true,
    });

    io.to(b).emit("matched", {
      partnerId: a,
      initiator: false,
    });

    console.log("🔥 MATCH:", a, b);
  }
}

// =========================
// SOCKET.IO
// =========================

io.on("connection", (socket) => {
  console.log("CONNECT:", socket.id);

  // 👉 ADD ONLINE
  onlineSockets.add(socket.id);
  emitOnlineUsers();

  // =========================
  // LOGIN
  // =========================
  socket.on("login", ({ email }) => {
    socket.email = email;
    console.log("LOGIN:", email);
  });

  // =========================
  // READY
  // =========================
  socket.on("ready", () => {
    if (partners.has(socket.id)) return;

    readyUsers.add(socket.id);
    addToQueue(socket.id);

    tryMatch();
  });

  // =========================
  // SIGNAL (WEBRTC)
  // =========================
  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  // =========================
  // NEXT
  // =========================
  socket.on("next", () => {
    const partner = partners.get(socket.id);

    partners.delete(socket.id);

    if (partner) {
      partners.delete(partner);

      io.to(partner).emit("partner-disconnected");
    }

    readyUsers.add(socket.id);
    addToQueue(socket.id);

    tryMatch();
  });

  // =========================
  // DISCONNECT
  // =========================
  socket.on("disconnect", () => {
    console.log("DISCONNECT:", socket.id);

    // 👉 REMOVE ONLINE
    onlineSockets.delete(socket.id);
    emitOnlineUsers();

    const partner = partners.get(socket.id);

    partners.delete(socket.id);
    readyUsers.delete(socket.id);
    removeFromQueue(socket.id);

    if (partner) {
      partners.delete(partner);

      io.to(partner).emit("partner-disconnected");
    }

    tryMatch();
  });
});

// =========================
// START SERVER
// =========================

server.listen(3001, () => {
  console.log("🚀 Server running on 3001");
});