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

// ================= QUEUE =================
let queue = [];

const removeFromQueue = (socketId) => {
  queue = queue.filter((s) => s.id !== socketId);
};

const addToQueue = (socket) => {
  removeFromQueue(socket.id);

  if (!socket.partner) {
    queue.push(socket);
  }
};

const matchUsers = () => {
  queue = queue.filter((s) => s.connected && !s.partner);

  while (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();

    if (!a || !b) return;

    a.partner = b.id;
    b.partner = a.id;

    io.to(a.id).emit("matched", b.id);
    io.to(b.id).emit("matched", a.id);
  }
};

// ================= SOCKET =================
io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.partner = null;

  // join queue
  socket.on("join", () => {
    addToQueue(socket);
    matchUsers();
  });

  // signal
  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  // next
  socket.on("next", () => {
    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");
    }

    socket.partner = null;

    addToQueue(socket);
    matchUsers();
  });

  // disconnect
  socket.on("disconnect", () => {
    removeFromQueue(socket.id);

    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");
    }

    socket.partner = null;
  });
});

server.listen(3001, () => {
  console.log("Server running on 3001");
});