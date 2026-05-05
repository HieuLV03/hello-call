const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();

app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

// =========================
// STORAGE
// =========================

let queue = [];

const partners = new Map();

const readyUsers = new Set();

// =========================
// ONLINE USERS
// =========================

function emitOnlineUsers() {
  io.emit("online-users", io.engine.clientsCount);

  console.log(
    "🟢 ONLINE USERS:",
    io.engine.clientsCount
  );
}

// =========================
// HELPERS
// =========================

function removeFromQueue(id) {
  queue = queue.filter((x) => x !== id);
}

function addToQueue(id) {
  removeFromQueue(id);

  if (!queue.includes(id)) {
    queue.push(id);
  }
}

// =========================
// MATCH
// =========================

function tryMatch() {
  // chỉ giữ user READY và chưa có partner
  queue = queue.filter(
    (id) =>
      readyUsers.has(id) &&
      !partners.has(id)
  );

  console.log("QUEUE:", queue);

  while (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();

    if (!a || !b) continue;

    if (a === b) continue;

    readyUsers.delete(a);
    readyUsers.delete(b);

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

  console.log({
    queue,
    ready: [...readyUsers],
    partners: [...partners.entries()],
  });
}

// =========================
// SOCKET
// =========================

io.on("connection", (socket) => {
  console.log("CONNECT:", socket.id);

  // update online users
  emitOnlineUsers();

  // =========================
  // LOGIN
  // =========================

  socket.on("login", ({ email }) => {
    socket.email = email;

    console.log("LOGIN:", email);
  });

  // =========================
  // READY
  // =========================

  socket.on("ready", () => {
    console.log("READY:", socket.id);

    // nếu đang có partner
    if (partners.has(socket.id)) {
      return;
    }

    readyUsers.add(socket.id);

    addToQueue(socket.id);

    tryMatch();
  });

  // =========================
  // SIGNAL
  // =========================

  socket.on("signal", ({ to, data }) => {
    io.to(to).emit("signal", {
      from: socket.id,
      data,
    });
  });

  // =========================
  // NEXT
  // =========================

  socket.on("next", () => {
    console.log("NEXT:", socket.id);

    const partner = partners.get(socket.id);

    // remove current
    partners.delete(socket.id);

    if (partner) {
      partners.delete(partner);

      io.to(partner).emit(
        "partner-disconnected"
      );
    }

    // ready again
    readyUsers.add(socket.id);

    addToQueue(socket.id);

    tryMatch();
  });

  // =========================
  // DISCONNECT
  // =========================

  socket.on("disconnect", () => {
    console.log("DISCONNECT:", socket.id);

    const partner = partners.get(socket.id);

    partners.delete(socket.id);

    readyUsers.delete(socket.id);

    removeFromQueue(socket.id);

    // update online count
    emitOnlineUsers();

    if (partner) {
      partners.delete(partner);

      io.to(partner).emit(
        "partner-disconnected"
      );
    }

    tryMatch();
  });
});

// =========================
// START
// =========================

server.listen(3001, () => {
  console.log(
    "🚀 Server running on 3001"
  );
});