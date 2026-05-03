import { io } from "socket.io-client";

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(
      "https://hello-call-socket-production.up.railway.app",
      {
        transports: ["websocket"],
      }
    );
  }

  return socket;
};