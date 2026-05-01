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

const cleanQueue = () => {
  queue = queue.filter((s) => s.connected && !s.partner);
};

const tryMatch = () => {
  cleanQueue();

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

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.partner = null;

  const joinQueue = () => {
    cleanQueue();

    // ❌ remove socket cũ nếu tồn tại
    queue = queue.filter((s) => s.id !== socket.id);

    queue.push(socket);

    tryMatch();
  };

  socket.on("join", () => {
    joinQueue();
  });

  socket.on("next", () => {
    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");
    }

    socket.partner = null;

    joinQueue();
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  socket.on("disconnect", () => {
    queue = queue.filter((s) => s.id !== socket.id);

    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");
    }
  });
});

server.listen(3001, () => {
  console.log("server running");
});