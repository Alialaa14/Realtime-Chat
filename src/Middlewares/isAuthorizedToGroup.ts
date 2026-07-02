import { type Response, type NextFunction, type Request } from "express";
import ApiError from "../helpers/ApiError.js";
import { db } from "../index.ts";
import { and, eq } from "drizzle-orm";
import ConversatiomMem from "../Schema/conversation_member.schema.ts";
export const isAdmin = () => {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      const userId: number = Number(req.user?.id);
      const groupId: number = Number(req.params?.id);
      const isAdminUser = await db
        .select({ admin: ConversatiomMem.admin })
        .from(ConversatiomMem)
        .where(
          and(
            eq(ConversatiomMem.userId, userId),
            eq(ConversatiomMem.conversationId, groupId),
          ),
        );
      if (!isAdminUser[0])
        return next(new ApiError("You are not memeber of this group", 403));
      if (!isAdminUser[0].admin)
        return next(new ApiError("You are not admin of this group", 403));
      return next();
    } catch (error) {
      console.log(error);
      return next(
        new ApiError("You are not authorized to access this route", 403),
      );
    }
  };
};
