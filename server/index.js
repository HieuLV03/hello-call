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

let queue = [];              // hàng chờ
let partners = new Map();    // socketId -> partnerId

function remove(id) {
  queue = queue.filter(x => x !== id);
}

function tryMatch() {
  // loại người đã match khỏi queue
  queue = queue.filter(id => !partners.has(id));

  while (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();

    if (!a || !b || a === b) continue;

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

    console.log("🔥 MATCH:", a, b);
  }
}

io.on("connection", (socket) => {
  console.log("CONNECT:", socket.id);

  // login
  socket.on("login", ({ email }) => {
    socket.email = email;
    console.log("LOGIN:", email);
  });

  // vào hàng chờ
  socket.on("ready", () => {
    if (partners.has(socket.id)) return;

    remove(socket.id);
    queue.push(socket.id);

    console.log("READY:", socket.id, "QUEUE:", queue.length);

    tryMatch();
  });

  // signal WebRTC
  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  // skip người đang chat
  socket.on("next", () => {
    const partner = partners.get(socket.id);

    partners.delete(socket.id);
    remove(socket.id);
    queue.push(socket.id);

    if (partner) {
      partners.delete(partner);
      remove(partner);

      io.to(partner).emit("partner-disconnected");
      queue.push(partner);
    }

    tryMatch();
  });

  // disconnect
  socket.on("disconnect", () => {
    const partner = partners.get(socket.id);

    partners.delete(socket.id);
    remove(socket.id);

    if (partner) {
      partners.delete(partner);
      remove(partner);

      io.to(partner).emit("partner-disconnected");
      queue.push(partner);
    }

    tryMatch();
  });
});

server.listen(3001, () => {
  console.log("Server running on 3001");
});