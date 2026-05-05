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

let queue = [];
let partners = new Map();
let readyUsers = new Set();

function removeFromQueue(id) {
  queue = queue.filter((x) => x !== id);
}

function tryMatch() {
  // chỉ match user READY + chưa có partner
  queue = queue.filter(
    (id) => readyUsers.has(id) && !partners.has(id)
  );

  while (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();

    if (!a || !b || a === b) continue;

    readyUsers.delete(a);
    readyUsers.delete(b);

    partners.set(a, b);
    partners.set(b, a);

    io.to(a).emit("matched", { partnerId: b, initiator: true });
    io.to(b).emit("matched", { partnerId: a, initiator: false });

    console.log("🔥 MATCH:", a, b);
  }
}

io.on("connection", (socket) => {
  console.log("CONNECT:", socket.id);

  socket.on("login", ({ email }) => {
    socket.email = email;
    console.log("LOGIN:", email);
  });

  socket.on("ready", () => {
    if (partners.has(socket.id)) return;

    readyUsers.add(socket.id);


removeFromQueue(socket.id);
queue.push(socket.id);
    console.log("READY:", socket.id, "QUEUE:", queue.length);

    tryMatch(
      
    );
    console.log({
  queue,
  ready: [...readyUsers],
  partners: [...partners.entries()],
});
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
    readyUsers.add(socket.id);

    removeFromQueue(socket.id);
    queue.push(socket.id);

    if (partner) {
      partners.delete(partner);
      readyUsers.add(partner);

      io.to(partner).emit("partner-disconnected");

      removeFromQueue(partner);
      queue.push(partner);
    }

    tryMatch();
  });

  socket.on("disconnect", () => {
    const partner = partners.get(socket.id);

    partners.delete(socket.id);
    readyUsers.delete(socket.id);
    removeFromQueue(socket.id);

    if (partner) {
      partners.delete(partner);
      readyUsers.add(partner);

      io.to(partner).emit("partner-disconnected");
      removeFromQueue(partner);
      queue.push(partner);
    }

    tryMatch();
  });
});

server.listen(3001, () => {
  console.log("Server running on 3001");
})