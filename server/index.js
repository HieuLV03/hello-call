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

// 🔥 danh sách user đang online
const onlineUsers = new Map(); // socket.id -> socket

const getRandomUser = (excludeId) => {
  const users = Array.from(onlineUsers.values()).filter(
    (u) => u.id !== excludeId && !u.partner
  );

  if (users.length === 0) return null;

  const randomIndex = Math.floor(Math.random() * users.length);
  return users[randomIndex];
};

const tryMatch = (socket) => {
  if (socket.partner) return;

  const partner = getRandomUser(socket.id);

  if (!partner) {
    onlineUsers.set(socket.id, socket);
    return;
  }

  // remove partner khỏi pool
  onlineUsers.delete(partner.id);

  socket.partner = partner.id;
  partner.partner = socket.id;

  io.to(socket.id).emit("matched", partner.id);
  io.to(partner.id).emit("matched", socket.id);
};

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.partner = null;

  // thêm vào pool
  onlineUsers.set(socket.id, socket);

  // 🔥 thử match ngay khi join
  tryMatch(socket);

  // ================= SIGNAL =================
  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  // ================= NEXT =================
  socket.on("next", () => {
    const partnerId = socket.partner;

    if (partnerId) {
      io.to(partnerId).emit("partner-disconnected");
    }

    socket.partner = null;

    // 🔥 quay lại pool và rematch
    tryMatch(socket);
  });

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);

    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");
    }
  });
});

server.listen(3001, "0.0.0.0", () => {
  console.log("Server running on 3001");
});