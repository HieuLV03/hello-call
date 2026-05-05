const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

let queue = [];
const partners = new Map();
const readyUsers = new Set();

// ===================== ONLINE COUNT (FIXED)
function emitOnlineUsers() {
  const count = io.of("/").sockets.size; // ⭐ CHUẨN SOCKET.IO
  io.emit("online-users", count);
}

// ===================== MATCH
function addToQueue(id) {
  if (!queue.includes(id)) queue.push(id);
}

function tryMatch() {
  queue = queue.filter(
    (id) => readyUsers.has(id) && !partners.has(id)
  );

  while (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();

    if (!a || !b) continue;

    readyUsers.delete(a);
    readyUsers.delete(b);

    partners.set(a, b);
    partners.set(b, a);

    io.to(a).emit("matched", { partnerId: b, initiator: true });
    io.to(b).emit("matched", { partnerId: a, initiator: false });

    console.log("MATCH:", a, b);
  }
}

// ===================== SOCKET
io.on("connection", (socket) => {
  console.log("CONNECT:", socket.id);

  emitOnlineUsers(); // ⭐ quan trọng

  socket.on("ready", () => {
    if (partners.has(socket.id)) return;

    readyUsers.add(socket.id);
    addToQueue(socket.id);

    tryMatch();
  });

  socket.on("disconnect", () => {
    console.log("DISCONNECT:", socket.id);

    readyUsers.delete(socket.id);
    queue = queue.filter((x) => x !== socket.id);

    const partner = partners.get(socket.id);

    partners.delete(socket.id);

    if (partner) {
      partners.delete(partner);
      io.to(partner).emit("partner-disconnected");
    }

    emitOnlineUsers(); // ⭐ update lại
    tryMatch();
  });
});

server.listen(3001, () => {
  console.log("RUN 3001");
});