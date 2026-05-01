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

const queue = [];

const add = (s) => {
  if (!queue.includes(s)) queue.push(s);
};

const remove = (s) => {
  const i = queue.indexOf(s);
  if (i !== -1) queue.splice(i, 1);
};

const match = () => {
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
  socket.partner = null;

  socket.on("join", () => {
    add(socket);
    match();
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", { from: socket.id, data });
  });

  socket.on("next", () => {
    socket.partner = null;
    add(socket);
    match();
  });

  socket.on("leave", () => {
    remove(socket);
  });

  socket.on("disconnect", () => {
    remove(socket);

    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");
    }
  });
});

server.listen(3001, () => {
  console.log("server running");
});