let queue = [];
let partners = new Map();
let users = new Map();
let readySet = new Set();

function removeFromQueue(id) {
  queue = queue.filter((x) => x !== id);
}

function tryMatch(io) {
  queue = queue.filter((id) => readySet.has(id) && !partners.has(id));

  while (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();

    if (!a || !b) return;

    readySet.delete(a);
    readySet.delete(b);

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
    users.set(socket.id, email);
  });

  socket.on("ready", () => {
    if (partners.has(socket.id)) return;

    readySet.add(socket.id);

    removeFromQueue(socket.id);
    queue.push(socket.id);

    console.log("READY:", socket.id, "QUEUE:", queue.length);

    tryMatch(io);
  });

  socket.on("next", () => {
    const partner = partners.get(socket.id);

    partners.delete(socket.id);
    readySet.add(socket.id);

    removeFromQueue(socket.id);
    queue.push(socket.id);

    if (partner) {
      partners.delete(partner);
      readySet.add(partner);

      io.to(partner).emit("partner-disconnected");

      removeFromQueue(partner);
      queue.push(partner);
    }

    tryMatch(io);
  });

  socket.on("disconnect", () => {
    const partner = partners.get(socket.id);

    partners.delete(socket.id);
    readySet.delete(socket.id);
    removeFromQueue(socket.id);
    users.delete(socket.id);

    if (partner) {
      partners.delete(partner);
      readySet.add(partner);

      io.to(partner).emit("partner-disconnected");

      removeFromQueue(partner);
      queue.push(partner);
    }

    tryMatch(io);
  });
});