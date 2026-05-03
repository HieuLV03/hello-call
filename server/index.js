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
let users = new Map(); // socketId -> { email, partner }

function matchUsers() {
  const candidates = Array.from(queue).filter((id) => {
    const u = users.get(id);
    return u && !u.partner;
  });

  while (candidates.length >= 2) {
    const a = candidates.shift();
    const b = candidates.shift();

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
    email: null,
    partner: null,
  });

  socket.on("join", ({ email }) => {
    const user = users.get(socket.id);
    if (!user) return;

    user.email = email;

    if (!user.partner) {
      queue.add(socket.id);
    }

    matchUsers();
  });

  socket.on("next", () => {
    const user = users.get(socket.id);
    if (!user) return;

    const partner = user.partner;

    user.partner = null;

    queue.add(socket.id);

    if (partner) {
      const p = users.get(partner);
      if (p) p.partner = null;

      io.to(partner).emit("partner-disconnected");
    }

    matchUsers();
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  socket.on("disconnect", () => {
    const user = users.get(socket.id);

    if (!user) return;

    queue.delete(socket.id);

    const partner = user.partner;

    if (partner) {
      const p = users.get(partner);
      if (p) p.partner = null;

      io.to(partner).emit("partner-disconnected");
    }

    users.delete(socket.id);
  });
});

server.listen(3001, () => {
  console.log("Server running on 3001");
});