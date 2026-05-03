let queue = [];
let partners = new Map();

const matchUsers = (io) => {
  while (queue.length >= 2) {
    const aId = queue.shift();
    const bId = queue.shift();

    const a = io.sockets.sockets.get(aId);
    const b = io.sockets.sockets.get(bId);

    if (!a || !b) continue;

    partners.set(aId, bId);
    partners.set(bId, aId);

    a.emit("matched", { partnerId: bId, initiator: true });
    b.emit("matched", { partnerId: aId, initiator: false });

    console.log("MATCH:", aId, bId);
  }
};