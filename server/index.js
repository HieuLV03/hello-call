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

let queue = [];
const partners = new Map();
const readyUsers = new Set();

function removeFromQueue(id) {
  queue = queue.filter((x) => x !== id);
}

function addToQueue(id) {
  removeFromQueue(id);

  if (!queue.includes(id)) {
    queue.push(id);
  }
}

function clearPartner(id) {
  const partner = partners.get(id);

  if (partner) {
    partners.delete(id);
    partners.delete(partner);

    io.to(partner).emit("partner-disconnected");
  }
}

function tryMatch() {
  // chỉ giữ user READY và chưa có partner
  queue = queue.filter(
    (id) => readyUsers.has(id) && !partners.has(id)
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

io.on("connection", (socket) => {
  console.log("CONNECT:", socket.id);

  socket.on("login", ({ email }) => {
    socket.email = email;

    console.log("LOGIN:", email);
  });

  socket.on("ready", () => {
    console.log("READY:", socket.id);

    // nếu đang có partner thì bỏ qua
    if (partners.has(socket.id)) {
      return;
    }

    readyUsers.add(socket.id);

    addToQueue(socket.id);

    tryMatch();
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

    // clear current
    partners.delete(socket.id);

    if (partner) {
      partners.delete(partner);

      io.to(partner).emit("partner-disconnected");
    }

    // current user ready again
    readyUsers.add(socket.id);
    addToQueue(socket.id);

    tryMatch();
  });

  socket.on("disconnect", () => {
    console.log("DISCONNECT:", socket.id);

    const partner = partners.get(socket.id);

    partners.delete(socket.id);

    readyUsers.delete(socket.id);

    removeFromQueue(socket.id);

    if (partner) {
      partners.delete(partner);

      io.to(partner).emit("partner-disconnected");
    }

    tryMatch();
  });
});

server.listen(3001, () => {
  console.log("🚀 Server running on 3001");
});