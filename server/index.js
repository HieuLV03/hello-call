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

// CHỈ LƯU ID, KHÔNG LƯU SOCKET OBJECT
let queue = [];
let partners = new Map();

/* ================= MATCH USERS ================= */
const matchUsers = () => {
  while (queue.length >= 2) {
    const aId = queue.shift();
    const bId = queue.shift();

    const a = io.sockets.sockets.get(aId);
    const b = io.sockets.sockets.get(bId);

    if (!a || !b) continue;

    partners.set(a.id, b.id);
    partners.set(b.id, a.id);

    a.emit("matched", {
      partnerId: b.id,
      initiator: true,
    });

    b.emit("matched", {
      partnerId: a.id,
      initiator: false,
    });

    console.log("MATCH:", a.id, b.id);
  }
};

/* ================= SOCKET ================= */
io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.on("join", () => {
    console.log("JOIN:", socket.id);

    // tránh duplicate
    queue = queue.filter((id) => id !== socket.id);
    queue.push(socket.id);

    matchUsers();
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  /* ================= NEXT ================= */
  socket.on("next", () => {
    console.log("NEXT:", socket.id);

    const partnerId = partners.get(socket.id);

    if (partnerId) {
      io.to(partnerId).emit("partner-disconnected");
      partners.delete(partnerId);
    }

    partners.delete(socket.id);

    queue = queue.filter((id) => id !== socket.id);
    queue.push(socket.id);

    matchUsers();
  });

  /* ================= DISCONNECT ================= */
  socket.on("disconnect", () => {
    console.log("DISCONNECT:", socket.id);

    const partnerId = partners.get(socket.id);

    if (partnerId) {
      io.to(partnerId).emit("partner-disconnected");
      partners.delete(partnerId);
    }

    partners.delete(socket.id);

    queue = queue.filter((id) => id !== socket.id);
  });
});

server.listen(3001, () => {
  console.log("server running on 3001");
});