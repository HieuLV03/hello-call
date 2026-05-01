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

const match = () => {
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
  }
};

io.on("connection", (socket) => {
  socket.partner = null;

  socket.on("join", () => {
    if (!queue.find((s) => s.id === socket.id)) {
      queue.push(socket);
    }
    match();
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { data });
  });

  socket.on("next", () => {
    queue = queue.filter((s) => s.id !== socket.id);
    queue.push(socket);
    match();
  });

  socket.on("disconnect", () => {
    queue = queue.filter((s) => s.id !== socket.id);
  });
});

server.listen(3001, () => {
  console.log("server running");
});