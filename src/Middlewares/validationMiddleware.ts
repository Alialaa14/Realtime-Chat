import z from "zod";
import ApiError from "../helpers/ApiError.ts";
import { type Request, type Response, type NextFunction } from "express";
import { StatusCodes } from "http-status-codes";

export const validationMiddleware = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = { ...req.body, ...req.query, ...req.params };
      const parsedData = schema.parse(data);
      if (parsedData) next();
    } catch (error) {
      if (error && error instanceof z.ZodError) {
        return next(
          new ApiError(error.issues[0]!.message, StatusCodes.BAD_REQUEST),
        );
      }
    }
  };
};
