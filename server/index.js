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

let queue = new Set();
let users = new Map();

function matchUsers(io) {
  const list = Array.from(queue).filter(id => {
    const u = users.get(id);
    return u && !u.partner;
  });

  while (list.length >= 2) {
    const a = list.shift();
    const b = list.shift();

    queue.delete(a);
    queue.delete(b);

    users.get(a).partner = b;
    users.get(b).partner = a;

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
  console.log("CONNECT:", socket.id);

  users.set(socket.id, {
    partner: null,
  });

  socket.on("join", () => {
    queue.add(socket.id);

    matchUsers(io); // 🔥 QUAN TRỌNG: phải gọi ngay
  });

  socket.on("next", () => {
    const user = users.get(socket.id);

    if (user?.partner) {
      io.to(user.partner).emit("partner-disconnected");
      users.get(user.partner).partner = null;
    }

    user.partner = null;

    queue.add(socket.id);

    matchUsers(io);
  });

  socket.on("disconnect", () => {
    queue.delete(socket.id);

    const user = users.get(socket.id);
    const partner = user?.partner;

    if (partner) {
      users.get(partner).partner = null;
      io.to(partner).emit("partner-disconnected");
    }

    users.delete(socket.id);
  });
});
server.listen(3001, () => {
  console.log("Server running on 3001");
});