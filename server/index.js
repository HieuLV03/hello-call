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

let queue = new Map(); // dùng Map cho sạch hơn

function removeFromQueue(id) {
  queue.delete(id);
}

function matchUsers() {
  const users = Array.from(queue.values());

  while (users.length >= 2) {
    const a = users.shift();
    const b = users.shift();

    queue.delete(a.id);
    queue.delete(b.id);

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
}

io.on("connection", (socket) => {
  console.log("CONNECTED:", socket.id);

  socket.partner = null;

  socket.on("join", () => {
    if (!queue.has(socket.id)) {
      queue.set(socket.id, { id: socket.id, socket });
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

    removeFromQueue(socket.id);

    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");
    }

    socket.partner = null;

    queue.set(socket.id, { id: socket.id, socket });

    matchUsers();
  });

  socket.on("disconnect", () => {
    console.log("DISCONNECT:", socket.id);

    removeFromQueue(socket.id);

    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");
    }
  });
});

server.listen(3001, () => {
  console.log("Server running on 3001");
});