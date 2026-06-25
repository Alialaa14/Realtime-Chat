import { type Response, type NextFunction } from "express";
import ApiError from "../helpers/ApiError.js";
export const isAuthorized = (...roles: string[]) => {
  return async (req: any, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new ApiError("You are not authorized to access this route", 403),
      );
    }
    return next();
  };
};
