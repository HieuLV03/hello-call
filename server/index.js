let readyQueue = new Set();
let partners = new Map();

function tryMatch(io) {
  const list = Array.from(readyQueue).filter((id) => !partners.has(id));

  while (list.length >= 2) {
    const a = list.shift();
    const b = list.shift();

    readyQueue.delete(a);
    readyQueue.delete(b);

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
    if (partners.has(socket.id)) return;

    readyQueue.add(socket.id);

    console.log("READY QUEUE SIZE:", readyQueue.size);

    tryMatch(io);
  });

  socket.on("next", () => {
    const partner = partners.get(socket.id);

    partners.delete(socket.id);

    if (partner) {
      partners.delete(partner);
      io.to(partner).emit("partner-disconnected");
      readyQueue.add(partner);
    }

    readyQueue.add(socket.id);

    tryMatch(io);
  });

  socket.on("disconnect", () => {
    const partner = partners.get(socket.id);

    readyQueue.delete(socket.id);
    partners.delete(socket.id);

    if (partner) {
      partners.delete(partner);
      io.to(partner).emit("partner-disconnected");
      readyQueue.add(partner);
    }

    tryMatch(io);
  });
});