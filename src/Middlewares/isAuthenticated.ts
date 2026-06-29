import { type Response, type NextFunction, type Request } from "express";
import ApiError from "../helpers/ApiError.js";
import jwt from "jsonwebtoken";
import { ENV } from "../helpers/ENV.js";

export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id =
      req.cookies?.accessToken ||
      (req.headers?.authorization?.startsWith("Bearer") &&
        req.headers.authorization.split("_")[1]);

    const providerId = req.cookies?.["connect.sid"];

    if (!id && !providerId) {
      return next(new ApiError("User not authenticated", 401));
    }

    if (id) {
      const user = jwt.verify(id, ENV.ACCESS_TOKEN_SECRET);
      req.user = user;
      return next();
    }
    if (providerId) {
      if (req.isAuthenticated()) return next();
      return next(new ApiError("User not authenticated", 401));
    }
  } catch (error) {
    console.log(error);
    return next(new ApiError("Error authenticating user", 500));
  }
};
