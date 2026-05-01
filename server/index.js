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

const queue = new Set(); // 🔥 dùng Set chống duplicate

const removeFromQueue = (socket) => {
  queue.delete(socket);
};

const addToQueue = (socket) => {
  queue.add(socket);
};

const matchUsers = () => {
  const users = Array.from(queue);

  while (users.length >= 2) {
    const a = users.shift();
    const b = users.shift();

    if (!a || !b) return;

    removeFromQueue(a);
    removeFromQueue(b);

    a.partner = b.id;
    b.partner = a.id;

    io.to(a.id).emit("matched", b.id);
    io.to(b.id).emit("matched", a.id);
  }
};

io.on("connection", (socket) => {
  socket.partner = null;

  socket.on("join", () => {
    addToQueue(socket);
    matchUsers();
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("next", () => {
    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");

      const partner = io.sockets.sockets.get(socket.partner);
      if (partner) partner.partner = null;
    }

    socket.partner = null;

    addToQueue(socket);
    matchUsers();
  });

  socket.on("disconnect", () => {
    removeFromQueue(socket);

    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");

      const partner = io.sockets.sockets.get(socket.partner);
      if (partner) partner.partner = null;
    }
  });
});

server.listen(3001, () => {
  console.log("server running");
});