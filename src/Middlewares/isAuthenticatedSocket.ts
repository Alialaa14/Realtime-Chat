import ApiError from "../helpers/ApiError.ts";
import { ENV } from "../helpers/ENV.ts";
import jwt from "jsonwebtoken";
import { type Response, type NextFunction } from "express";
import type { Socket } from "socket.io";
export const isAuthenticatedSocket = (socket: any, next: any) => {
  try {
    const accessToken = socket.handshake.headers.auth;
    const payload = jwt.verify(accessToken, ENV.ACCESS_TOKEN_SECRET);
    socket.user = payload;
    return next();
  } catch (error) {
    console.log(error);
  }
};
