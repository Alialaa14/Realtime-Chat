import { asyncHandler } from "../helpers/asyncHandler.ts";
import { type Response, type NextFunction } from "express";
import ApiResponse from "../helpers/ApiResponse.ts";
import ApiError from "../helpers/ApiError.ts";
import { ENV } from "../helpers/ENV.ts";
import jwt from "jsonwebtoken";

// Middleware for fetching data while the Access Token is Expired

export const isAuthenticatedRefreshToken = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const accessToken = req.cookies?.accessToken;

    if (!accessToken) return next(new ApiError("Unauthorized", 401));

    const payload = jwt.verify(accessToken, ENV.ACCESS_TOKEN_SECRET, {
      ignoreExpiration: true,
    });

    if (!payload) return next(new ApiError("Unauthorized or Expired", 401));
    req.user = payload;
    return next();
  },
);
