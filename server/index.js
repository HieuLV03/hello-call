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

let queue = [];

const matchUsers = () => {
  while (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();

    if (!a || !b) return;

    a.partner = b.id;
    b.partner = a.id;

    io.to(a.id).emit("matched", {
      partnerId: b.id,
      initiator: true,
    });

    io.to(b.id).emit("matched", {
      partnerId: a.id,
      initiator: false,
    });

    console.log("MATCH:", a.id, b.id);
  }
};

io.on("connection", (socket) => {
  console.log("connected:", socket.id);

  socket.partner = null;

socket.on("join", () => {
  console.log("JOIN:", socket.id);

  const exists = queue.some((s) => s.id === socket.id);

  if (!exists) {
    queue.push({ id: socket.id });
  }

  matchUsers();
});

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

socket.on("next", () => {
  console.log("NEXT:", socket.id);

  queue = queue.filter((s) => s.id !== socket.id);

  if (socket.partner) {
    io.to(socket.partner).emit("partner-disconnected");
  }

  socket.partner = null;

  queue.push({ id: socket.id });

  matchUsers();
});

socket.on("disconnect", () => {
  console.log("DISCONNECT:", socket.id);

  queue = queue.filter((s) => s.id !== socket.id);

  if (socket.partner) {
    io.to(socket.partner).emit("partner-disconnected");
  }
});
});

server.listen(3001, () => {
  console.log("server running on 3001");
});