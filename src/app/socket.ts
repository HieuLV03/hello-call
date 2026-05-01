import { io } from "socket.io-client";

let socket: any;

export const getSocket = () => {
  if (!socket) {
    socket = io("https://hello-call-socket-production.up.railway.app", {
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
    });
  }
  return socket;
};