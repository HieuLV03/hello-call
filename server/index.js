// server.js
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

const users = new Map(); // id -> { id, partner, status }

const matchUsers = () => {
  const waiting = Array.from(users.values()).filter(u => u.status === "waiting");

  while (waiting.length >= 2) {
    const a = waiting.shift();
    const b = waiting.shift();

    a.partner = b.id;
    b.partner = a.id;
    a.status = "paired";
    b.status = "paired";

    users.set(a.id, a);
    users.set(b.id, b);

    console.log(`✅ Matched: ${a.id} <-> ${b.id}`);

    io.to(a.id).emit("matched", b.id);
    io.to(b.id).emit("matched", a.id);
  }
};

io.on("connection", (socket) => {
  console.log("🔗 Connected:", socket.id);

  users.set(socket.id, {
    id: socket.id,
    partner: null,
    status: "idle",
  });

  socket.on("join", () => {
    const user = users.get(socket.id);
    if (user) {
      user.status = "waiting";
      user.partner = null;
      users.set(socket.id, user);
      console.log(`👤 ${socket.id} joined waiting queue`);
      matchUsers();
    }
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("next", () => {
    const user = users.get(socket.id);
    if (!user) return;

    if (user.partner) {
      io.to(user.partner).emit("partner-disconnected");
      const partner = users.get(user.partner);
      if (partner) {
        partner.partner = null;
        partner.status = "waiting";
        users.set(partner.id, partner);
      }
    }

    user.partner = null;
    user.status = "waiting";
    users.set(socket.id, user);
    matchUsers();
  });

  socket.on("disconnect", () => {
    const user = users.get(socket.id);
    if (user?.partner) {
      io.to(user.partner).emit("partner-disconnected");
      const partner = users.get(user.partner);
      if (partner) {
        partner.partner = null;
        partner.status = "waiting";
        users.set(partner.id, partner);
      }
    }
    console.log("❌ Disconnected:", socket.id);
    users.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Socket Server running on port ${PORT}`);
});