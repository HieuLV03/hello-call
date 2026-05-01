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

// ================= MATCH ENGINE =================
const tryMatchAll = () => {
  const users = Array.from(onlineUsers.values());

  // 🔥 chỉ lấy user chưa match
  const freeUsers = users.filter((u) => !u.partner);

  while (freeUsers.length >= 2) {
    const a = freeUsers.shift();
    const b = freeUsers.shift();

    if (!a || !b) return;

    // remove khỏi pool
    onlineUsers.delete(a.id);
    onlineUsers.delete(b.id);

    a.partner = b.id;
    b.partner = a.id;

    io.to(a.id).emit("matched", b.id);
    io.to(b.id).emit("matched", a.id);
  }
};

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.partner = null;

  // add vào pool
  onlineUsers.set(socket.id, socket);

  // 🔥 IMPORTANT: reset trạng thái khi join
  socket.partner = null;

  tryMatchAll();

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

      const partner = onlineUsers.get(partnerId);
      if (partner) partner.partner = null;
    }

    socket.partner = null;

    onlineUsers.set(socket.id, socket);

    tryMatchAll();
  });

  // ================= DISCONNECT =================
  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);

    if (socket.partner) {
      const partner = onlineUsers.get(socket.partner);
      if (partner) partner.partner = null;

      io.to(socket.partner).emit("partner-disconnected");
    }
  });
});

server.listen(3001, "0.0.0.0", () => {
  console.log("Server running on 3001");
});