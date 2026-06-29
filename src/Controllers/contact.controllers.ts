import Contact from "../Schema/Contacts.schema.ts";
import User from "../Schema/user.schema.ts";
import { type Request, type Response, type NextFunction } from "express";
import { asyncHandler } from "../helpers/asyncHandler.ts";
import { db } from "../index.ts";
import { and, eq } from "drizzle-orm";
import ApiError from "../helpers/ApiError.ts";
import { StatusCodes } from "http-status-codes";
import ApiResponse from "../helpers/ApiResponse.ts";

export const createContact = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const { phoneNumber, name } = req.body;
    const userId = req.user?.id;
    console.log(typeof phoneNumber);
    console.log(typeof userId);
    const findCreatedUser = await db
      .select({ phonNumber: User.phoneNumber })
      .from(User)
      .where(eq(User.phoneNumber, phoneNumber));

    const findInContact = await db
      .select()
      .from(Contact)
      .where(eq(Contact.phoneNumber, phoneNumber));
    if (findInContact.length > 0)
      return next(
        new ApiError(
          "You've Already Save This Contact",
          StatusCodes.BAD_REQUEST,
        ),
      );

    let usingPlatform: boolean = true;

    if (findCreatedUser.length == 0) usingPlatform = false;

    const createContact = await db
      .insert(Contact)
      .values({ userId, name, phoneNumber, usingPlatform })
      .$returningId();

    console.log(createContact);

    if (createContact.length == 0)
      return next(new ApiError("Error While Creating New Contact", 401));

    let user: {} | undefined;

    if (usingPlatform) {
      const getUser = await db
        .select({
          username: User.username,
          picture_url: User.picture_url,
          phoneNumber: User.phoneNumber,
        })
        .from(User)
        .where(eq(User.phoneNumber, phoneNumber));
      console.log(getUser);
      user = getUser[0];
    } else {
      const getUser = await db
        .select({ name: Contact.name, phoneNumber: Contact.phoneNumber })
        .from(Contact)
        .where(eq(Contact.phoneNumber, phoneNumber));
      console.log(getUser);
      user = getUser[0];
    }

    return res
      .status(StatusCodes.CREATED)
      .json(new ApiResponse(true, "Contact Created Successfully", user));
  },
);

export const editContact = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const { name, phoneNumber } = req.body;
    const contactId = req.query.contact;
    const userId = req.user?.id;

    const findContact = await db
      .select()
      .from(Contact)
      .where(
        and(
          eq(Contact.userId, userId),
          eq(Contact.contactId, Number(contactId)),
        ),
      );

    if (findContact.length == 0)
      return next(
        new ApiError("You don't Have This Contact ", StatusCodes.BAD_REQUEST),
      );

    const updateContact = await db.update(Contact).set({ name, phoneNumber });
    console.log(updateContact);

    return res
      .status(StatusCodes.OK)
      .json(
        new ApiResponse(true, "Contact Updated Successfully", updateContact),
      );
  },
);

export const deleteContact = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const contactId = req.query.contact;
    const userId = req.user?.id;

    const findContact = await db
      .delete(Contact)
      .where(
        and(
          eq(Contact.userId, userId),
          eq(Contact.contactId, Number(contactId)),
        ),
      );

    if (!findContact[0].affectedRows)
      return next(
        new ApiError("You don't Have This Contact ", StatusCodes.BAD_REQUEST),
      );

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Contact Deleted Successfully", findContact));
  },
);
