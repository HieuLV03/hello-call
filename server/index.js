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

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.partner = null;

  socket.on("join", () => {
    if (!queue.includes(socket)) {
      queue.push(socket);
    }

    match();
  });

  const match = () => {
    queue = queue.filter((s) => s.connected && !s.partner);

    while (queue.length >= 2) {
      const a = queue.shift();
      const b = queue.shift();

      if (!a || !b) return;

      a.partner = b.id;
      b.partner = a.id;

      console.log(`MATCH: ${a.id} <-> ${b.id}`);

      io.to(a.id).emit("matched", {
        partnerId: b.id,
        initiator: true,
      });

      io.to(b.id).emit("matched", {
        partnerId: a.id,
        initiator: false,
      });
    }
  };

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  socket.on("next", () => {
    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");
    }

    socket.partner = null;

    if (!queue.includes(socket)) {
      queue.push(socket);
    }

    match();
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