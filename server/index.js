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

let queue = []; // ready users
let partners = new Map(); // socketId -> partnerId

function removeFromQueue(id) {
  queue = queue.filter((x) => x !== id);
}

function tryMatch() {
  // lọc người đang không còn valid
  queue = queue.filter((id) => !partners.has(id));

  while (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();

    if (!a || !b) continue;

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
  console.log("CONNECT:", socket.id);

  // vào queue khi ready
  socket.on("ready", () => {
    if (partners.has(socket.id)) return;

    if (!queue.includes(socket.id)) {
      queue.push(socket.id);
    }

    console.log("READY:", socket.id, "QUEUE:", queue.length);

    tryMatch();
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  // NEXT = bỏ partner + quay lại queue
  socket.on("next", () => {
    const partner = partners.get(socket.id);

    partners.delete(socket.id);
    removeFromQueue(socket.id);

    if (partner) {
      partners.delete(partner);

      io.to(partner).emit("partner-disconnected");

      removeFromQueue(partner);
      queue.push(partner);
    }

    queue.push(socket.id);

    tryMatch();
  });

  socket.on("disconnect", () => {
    console.log("DISCONNECT:", socket.id);

    const partner = partners.get(socket.id);

    removeFromQueue(socket.id);
    partners.delete(socket.id);

    if (partner) {
      partners.delete(partner);
      io.to(partner).emit("partner-disconnected");
      removeFromQueue(partner);
      queue.push(partner);
    }

    tryMatch();
  });
});

server.listen(3001, () => {
  console.log("Server running on 3001");
});