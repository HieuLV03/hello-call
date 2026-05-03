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

// user state
let onlineUsers = new Map(); // socketId -> { email, status }
let readyQueue = []; // chỉ chứa socketId
let partners = new Map();

function tryMatch() {
  while (readyQueue.length >= 2) {
    const a = readyQueue.shift();
    const b = readyQueue.shift();

    if (!a || !b) continue;

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

    console.log("MATCH:", a, b);
  }
}

io.on("connection", (socket) => {
  console.log("CONNECT:", socket.id);

  // LOGIN GG xong
  socket.on("login", ({ email }) => {
    onlineUsers.set(socket.id, {
      email,
      status: "online",
    });

    console.log("ONLINE:", email);
  });

  // CLICK MATCH BUTTON
  socket.on("ready", () => {
    const user = onlineUsers.get(socket.id);
    if (!user) return;

    user.status = "ready";

    if (!readyQueue.includes(socket.id) && !partners.has(socket.id)) {
      readyQueue.push(socket.id);
    }

    console.log("READY:", socket.id);

    tryMatch();
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  // NEXT (skip user)
  socket.on("next", () => {
    const partner = partners.get(socket.id);

    partners.delete(socket.id);

if (!readyQueue.includes(socket.id)) {
  readyQueue.push(socket.id);
}
    if (partner) {
      partners.delete(partner);
      io.to(partner).emit("partner-disconnected");
      readyQueue.push(partner);
    }

    tryMatch();
  });

  socket.on("disconnect", () => {
    console.log("DISCONNECT:", socket.id);

    readyQueue = readyQueue.filter((id) => id !== socket.id);
    onlineUsers.delete(socket.id);

    const partner = partners.get(socket.id);

    partners.delete(socket.id);

    if (partner) {
      partners.delete(partner);
      io.to(partner).emit("partner-disconnected");
      readyQueue.push(partner);
    }

    tryMatch();
  });
});

server.listen(3001, () => {
  console.log("Server running on 3001");
});