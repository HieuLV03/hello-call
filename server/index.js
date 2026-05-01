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

let waitingUser = null;

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.partner = null;

  // 🔥 remove invalid waiting user
  if (waitingUser && !waitingUser.connected) {
    waitingUser = null;
  }

  const tryMatch = () => {
    if (!waitingUser || waitingUser.id === socket.id) return;

    const partner = waitingUser;
    waitingUser = null;

    socket.partner = partner.id;
    partner.partner = socket.id;

    io.to(partner.id).emit("matched", socket.id);
    io.to(socket.id).emit("matched", partner.id);
  };

  // 🔥 try match immediately
  if (!socket.partner) {
    tryMatch();
  } else {
    waitingUser = socket;
  }

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  socket.on("next", () => {
    const partnerId = socket.partner;

    if (partnerId) {
      io.to(partnerId).emit("partner-disconnected");
    }

    socket.partner = null;

    // 🔥 IMPORTANT: không set waiting ngay lập tức
    waitingUser = socket;
  });

  socket.on("disconnect", () => {
    if (waitingUser?.id === socket.id) {
      waitingUser = null;
    }

    if (socket.partner) {
      io.to(socket.partner).emit("partner-disconnected");
    }
  });
});

server.listen(3001, "0.0.0.0", () => {
  console.log("Server running on 3001");
});