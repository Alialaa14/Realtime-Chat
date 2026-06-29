import { Socket } from "socket.io";
import { db } from "../index.ts";
import Message from "../Schema/message.schema.ts";
import Conversation from "../Schema/conversation.schema.ts";
import ConversatiomMem from "../Schema/conversation_member.schema.ts";
import Message_Recipents from "../Schema/message-recipents.schema.ts";
import User from "../Schema/user.schema.ts";

// Architicure Of RealTime Chat App

/*
- client Send Message to Server => Server Validation => Send To Another Client (socket Id )
*/

export const recieveMessage = (io: any, socket: Socket) => {
  return socket.on(
    "chat:new",
    async (data: { content?: string; filePath?: string }) => {
      if (!data?.content && !data?.filePath) {
        console.log("No Data is Entered");
        return errorController(socket, { errMessage: "No Data is Entered" });
      }
      const createdMessage = await db
        .insert(Message)
        .values({
          conversationId: 1,
          content: data.content,
          operatedAt: new Date(),
        })
        .$returningId();

      if (createdMessage.length == 0)
        return errorController(socket, {
          errMessage: "Error While Creating Message",
        });
    },
  );
};

export const sendMessage = (
  io: any,
  socket: Socket,
  connectedUsers: Map<string, string>,
  userId: number,
  data: {},
) => {
  return socket.emit("chat:send", data);
};

// BroadCast Message To Specific Group
export const broadCastMessage = (
  io: any,
  socket: Socket,
  connectedUsers: Map<string, string>,
  users: number[],
  data: {},
) => {
  return io.to("roomId").emit("group:send", data);
};

export const userJoinedGroup = (io: any, socket: Socket, roomId: string) => {
  // socket.join("roomId");
  // get Group Data and userId from Client => validate group and that is user is not already in group => Register User in Group Database => emit a socket event to client

  return socket.emit("chat:joined", { message: "User Joined Group" });
};

export const userLeftGroup = (io: any, socket: Socket) => {
  // socket.leave("roomId");
  // get Group Data and userId from Client => validate group and that is user is already in group => Clear User from Group Database => emit a socket event to client
  return socket.emit("chat:left", { message: "User Left Group" });
};

export const typing_indicator = (
  socket: Socket,
  connectedUsers: Map<string, string>,
  userId: number,
  text: string,
) => {
  // validate that the text is not empty while not empty => emit a socket event to client
  // socket.on(client-event , text) =>
  // return socket.to(connectedUsers.get(userId)).emit("typing:indicator" , {message:"Typing..."});
};

// Error Controller To Send Back error to client
export const errorController = (
  socket: Socket,
  data: { errMessage: string },
) => {
  return socket.emit("chat:error", { errorMessage: data.errMessage });
};
