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

let queue = new Set(); // FIX: dùng Set tránh duplicate
let partners = new Map(); // socketId -> partnerId

function matchUsers() {
  const users = Array.from(queue);

  while (users.length >= 2) {
    const a = users.shift();
    const b = users.shift();

    queue.delete(a);
    queue.delete(b);

    partners.set(a, b);
    partners.set(b, a);

    io.to(a).emit("matched", {
      partnerId: b,
      initiator: true,
    });

    io.to(b).emit("matched", {
      partnerId: a,
      initiator: false,
    });

    console.log("MATCH:", a, b);
  }
}

io.on("connection", (socket) => {
  console.log("CONNECTED:", socket.id);

  socket.on("join", () => {
    console.log("JOIN:", socket.id);

    if (partners.has(socket.id)) return;

    queue.add(socket.id);
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

    const partner = partners.get(socket.id);

    partners.delete(socket.id);

    if (partner) {
      partners.delete(partner);
      io.to(partner).emit("partner-disconnected");
    }

    queue.add(socket.id);
    matchUsers();
  });

  socket.on("disconnect", () => {
    console.log("DISCONNECT:", socket.id);

    queue.delete(socket.id);

    const partner = partners.get(socket.id);

    if (partner) {
      partners.delete(partner);
      io.to(partner).emit("partner-disconnected");
    }

    partners.delete(socket.id);
  });
});

server.listen(3001, () => {
  console.log("Server running 3001");
});