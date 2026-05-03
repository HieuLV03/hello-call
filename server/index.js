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

const queue = new Set(); // 🔥 dùng Set chống duplicate

function matchUsers() {
  const users = Array.from(queue);

  while (users.length >= 2) {
    const a = users.shift();
    const b = users.shift();

    queue.delete(a);
    queue.delete(b);

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

  socket.partner = null;

  socket.on("join", () => {
    if (!queue.has(socket.id)) {
      queue.add(socket.id);
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
    queue.delete(socket.id);

    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");
    }

    socket.partner = null;

    queue.add(socket.id);

    matchUsers();
  });

  socket.on("disconnect", () => {
    queue.delete(socket.id);

    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");
    }
  });
});

server.listen(3001, () => {
  console.log("Server running");
});