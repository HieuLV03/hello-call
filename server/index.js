let queue = [];
let partners = new Map();

function cleanQueue() {
  queue = queue.filter((id) => !partners.has(id));
}

function tryMatch(io) {
  cleanQueue();

  while (queue.length >= 2) {
    const a = queue.shift();
    const b = queue.shift();

    if (!a || !b) continue;

    partners.set(a, b);
    partners.set(b, a);

    io.to(a).emit("matched", { partnerId: b, initiator: true });
    io.to(b).emit("matched", { partnerId: a, initiator: false });

    console.log("MATCH:", a, b);
  }
}

io.on("connection", (socket) => {
  console.log("CONNECT:", socket.id);

  socket.on("login", ({ email }) => {
    socket.email = email;
  });

  socket.on("ready", () => {
    // ❌ chống spam queue
    if (partners.has(socket.id)) return;

    if (!queue.includes(socket.id)) {
      queue.push(socket.id);
    }

    console.log("QUEUE:", queue);

    tryMatch(io);
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

    tryMatch(io);
  });

  socket.on("disconnect", () => {
    const partner = partners.get(socket.id);

    queue = queue.filter((id) => id !== socket.id);
    partners.delete(socket.id);

    if (partner) {
      partners.delete(partner);
      io.to(partner).emit("partner-disconnected");
      queue.push(partner);
    }

    tryMatch(io);
  });
});