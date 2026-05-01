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

// 🔥 ONLY QUEUE (KHÔNG MAP)
const queue = [];

const addToQueue = (socket) => {
  if (!queue.includes(socket)) {
    queue.push(socket);
  }
};

const removeFromQueue = (socket) => {
  const i = queue.indexOf(socket);
  if (i !== -1) queue.splice(i, 1);
};

const matchUsers = () => {
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

  addToQueue(socket);

  matchUsers();

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

    addToQueue(socket);

    matchUsers();
  });

  socket.on("disconnect", () => {
    removeFromQueue(socket);

    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");
    }
  });
});

server.listen(3001, "0.0.0.0", () => {
  console.log("Server running on 3001");
});