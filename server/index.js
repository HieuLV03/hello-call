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

const onlineUsers = new Map();

// 🔥 match ANY 2 users in pool
const tryMatchAll = () => {
  const users = Array.from(onlineUsers.values()).filter(
    (u) => !u.partner
  );

  while (users.length >= 2) {
    const userA = users.shift();
    const userB = users.shift();

    if (!userA || !userB) break;

    onlineUsers.delete(userA.id);
    onlineUsers.delete(userB.id);

    userA.partner = userB.id;
    userB.partner = userA.id;

    io.to(userA.id).emit("matched", userB.id);
    io.to(userB.id).emit("matched", userA.id);
  }
};

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.partner = null;

  onlineUsers.set(socket.id, socket);

  // 🔥 IMPORTANT: ALWAYS re-check FULL POOL
  tryMatchAll();

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  socket.on("next", () => {
    const partnerId = socket.partner;

    if (partnerId) {
      io.to(partnerId).emit("partner-disconnected");
    }

    socket.partner = null;

    onlineUsers.set(socket.id, socket);

    tryMatchAll();
  });

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