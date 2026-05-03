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

let queue = []; // chỉ chứa socket.id
let partners = new Map(); // socket.id -> partnerId

function tryMatch() {
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

  socket.on("join", () => {
    if (!queue.includes(socket.id) && !partners.has(socket.id)) {
      queue.push(socket.id);
    }

    tryMatch();
  });

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  socket.on("next", () => {
    const partner = partners.get(socket.id);

    partners.delete(socket.id);
    queue.push(socket.id);

    if (partner) {
      partners.delete(partner);
      io.to(partner).emit("partner-disconnected");
      queue.push(partner);
    }

    tryMatch();
  });

  socket.on("disconnect", () => {
    console.log("DISCONNECT:", socket.id);

    queue = queue.filter((id) => id !== socket.id);

    const partner = partners.get(socket.id);
    partners.delete(socket.id);

    if (partner) {
      partners.delete(partner);
      io.to(partner).emit("partner-disconnected");
      queue.push(partner);
    }

    tryMatch();
  });
});

server.listen(3001, () => {
  console.log("Server running 3001");
});