import { io } from "socket.io-client";

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io("https://hello-call-socket-production.up.railway.app", {
      transports: ["websocket"],
      autoConnect: false,
    });
  }

  return socket;
};