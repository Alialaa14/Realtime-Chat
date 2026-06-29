import { Server } from "socket.io";
import { ENV } from "../helpers/ENV.ts";
import http from "http";
import express from "express";
import { isAuthenticatedSocket } from "../Middlewares/isAuthenticatedSocket.ts";
import { recieveMessage } from "../Controllers/message.controllers.ts";
const app = express();
export const server = http.createServer(app);
export const io = new Server(server, {
  cors: {
    origin: "*",
  },
});
io.use(isAuthenticatedSocket);
const connectedUsers = new Map();

io.on("connection", (socket: any) => {
  const userId = socket.user.id;
  const socketId = socket.id;
  connectedUsers.set(userId, socketId);
  console.log(`New User Connted To Socket ${socket.id}`);

  recieveMessage(io, socket);

  socket.on("disconnect", (socket: any) => {
    console.log(`User has disconnected with socket id ${socket.id}`);
    connectedUsers.delete(socket?.user?.id);
  });
});

io.on("connect_error", (err) => {
  console.log(err);
});

server.listen(ENV.PORT, () => {
  console.log("Server running on port 3000");
});

export default app;
