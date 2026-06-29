import { asyncHandler } from "../helpers/asyncHandler.ts";
import { type Request, type Response, type NextFunction } from "express";
import ApiResponse from "../helpers/ApiResponse.ts";
import ApiError from "../helpers/ApiError.ts";
import User from "../Schema/user.schema.ts";
import { db } from "../index.ts";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { ENV } from "../helpers/ENV.ts";
import { StatusCodes } from "http-status-codes";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.ts";
import jwt from "jsonwebtoken";
import { otpEmailTemplate } from "../helpers/emailTemplates.ts";
import { sendEmail } from "../helpers/sendEmail.ts";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../helpers/generateTokens.ts";

import { removePicsFromLocal } from "../helpers/removeLocalPics.ts";

import { Passport } from "../utils/googleoAuth.ts";

export const register = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { username, email, phoneNumber, password } = req.body;
    const file = req.file;

    if (!file) return next(new ApiError("Please Provide Us Your Image", 400));
    const checkExistingUser = await db
      .select()
      .from(User)
      .where(and(eq(User.email, email), eq(User.phoneNumber, phoneNumber)));

    if (checkExistingUser.length > 0)
      return next(new ApiError("Email is Already Registered", 409));

    // Generate Salt
    const salt = await bcrypt.genSalt(10);
    // Hashing the Password
    const hashedPassword = await bcrypt.hash(password, salt);

    // Upload To Cloudinary
    const { secure_url, public_id } = await uploadToCloudinary(
      req.file?.path || "",
      `users/${username}-${email}`,
    );

    // Helper To Remove Local Pics from Local Device

    removePicsFromLocal(req.file?.path || "");

    const newUser = await db
      .insert(User)
      .values({
        username,
        email,
        phoneNumber: phoneNumber,
        password: hashedPassword,
        picture_url: secure_url,
        picture_id: public_id,
      })
      .$returningId();

    if (!newUser || newUser.length === 0)
      return next(new ApiError("Error While Creating New User", 500));

    const user = await db
      .select({
        username: User.username,
        email: User.email,
        isOnline: User.isOnline,
        picture_url: User.picture_url,
        picture_id: User.picture_id,
        phoneNumber: User.phoneNumber,
      })
      .from(User)
      .where(eq(User.id, newUser[0]?.id || 0));
    return res
      .status(StatusCodes.CREATED)
      .json(new ApiResponse(true, "User Created Successfully", user));
  },
);

export const login = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    const checkExistingUser = await db
      .select()
      .from(User)
      .where(eq(User.email, email));

    if (checkExistingUser.length === 0)
      return next(new ApiError("User Not Found", 404));

    const user = checkExistingUser[0];
    if (!user) return next(new ApiError("User Not Found", 404));
    const isPasswordCorrect = await bcrypt.compare(password, user.password!);
    console.log(isPasswordCorrect);
    if (!isPasswordCorrect)
      return next(new ApiError("Incorrect Password", StatusCodes.UNAUTHORIZED));

    // Generate Jwt Token
    const accessToken = generateAccessToken({ id: user.id });
    const refreshToken = generateRefreshToken({ id: user.id });

    await db
      .update(User)
      .set({
        RefreshToken: refreshToken,
        isOnline: true,
      })
      .where(eq(User.id, user.id));

    res.cookie("accessToken", accessToken, {
      maxAge: Number(ENV.ACCESS_TOKEN_EXPIRY),
      httpOnly: true,
      secure: true,
    });

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Login Success", null));
  },
);

export const logout = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    await db.update(User).set({
      RefreshToken: null,
      isOnline: false,
    });
    res.clearCookie("accessToken");
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Logout Success", null));
  },
);

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;

    const checkExistingUser = await db
      .select()
      .from(User)
      .where(eq(User.email, email));

    if (checkExistingUser.length === 0)
      return next(new ApiError("User Not Found", 404));

    const user = checkExistingUser[0];
    if (!user) return next(new ApiError("User Not Found", 404));

    const otp = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");

    const otpExpiry = new Date(Date.now() + 15 * 60 * 1000);

    console.log(otpExpiry, user.otpExpiry);
    await db.update(User).set({ otp, otpExpiry }).where(eq(User.id, user.id));

    await sendEmail(
      user.email,
      "Reset Password",
      otpEmailTemplate({
        name: user.username,
        otp,
        expiresInMinutes: Math.ceil(
          (otpExpiry.getTime() - Date.now()) / 1000 / 60,
        ),
        appName: "Authenticator",
        supportEmail: "8lS4o@example.com",
      }),
    );

    const accessToken = generateAccessToken({ id: user.id });

    res.cookie("accessToken", accessToken, {
      maxAge: Number(ENV.ACCESS_TOKEN_EXPIRY),
      httpOnly: true,
      secure: true,
    });

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "OTP Sent Successfully", null));
  },
);

export const verifyOtp = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { otp } = req.body;
    const accessToken = req.cookies?.accessToken;
    const payload = jwt.verify(accessToken, ENV.ACCESS_TOKEN_SECRET) as {
      id: number;
    };
    const checkExistingUser = await db
      .select()
      .from(User)
      .where(eq(User.id, payload.id));

    console.log(checkExistingUser);

    if (checkExistingUser.length === 0)
      return next(new ApiError("User Not Found", 404));

    const user = checkExistingUser[0];
    if (!user) return next(new ApiError("User Not Found", 404));
    console.log(user.otpExpiry, new Date());
    if (!user.otpExpiry || new Date(user.otpExpiry) < new Date())
      return next(new ApiError("OTP Expired", StatusCodes.UNAUTHORIZED));

    // Then check OTP value
    if (user.otp !== otp)
      return next(new ApiError("Incorrect OTP", StatusCodes.UNAUTHORIZED));

    await db
      .update(User)
      .set({ otp: null, otpExpiry: null })
      .where(eq(User.id, user.id));

    const resetToken = generateAccessToken({ id: user.id });

    res.clearCookie("accessToken");
    res.cookie("resetToken", resetToken, {
      maxAge: 10 * 60 * 1000,
      httpOnly: true,
      secure: true,
    });

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "OTP Verified Successfully", null));
  },
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { password } = req.body;
    const resetToken = req.cookies?.resetToken;
    const payload = jwt.verify(resetToken, ENV.ACCESS_TOKEN_SECRET) as {
      id: number;
    };

    const checkExistingUser = await db
      .select()
      .from(User)
      .where(eq(User.id, payload.id));

    if (checkExistingUser.length === 0)
      return next(new ApiError("User Not Found", 404));

    const user = checkExistingUser[0];
    if (!user) return next(new ApiError("User Not Found", 404));

    // Hashing the Password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    await db
      .update(User)
      .set({ password: hashedPassword })
      .where(eq(User.id, user.id));

    res.clearCookie("resetToken");

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Password Reset Successfully", null));
  },
);

export const updateUser = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const { username, email } = req.body;
    const filePath = req.file?.path;
    const userId = req.user.id;

    // Get User Data
    const user = await db.select().from(User).where(eq(User.id, userId));
    if (!user) return next(new ApiError("We Can't Find User", 404));

    // Seperate Updating Photo
    if (filePath) {
      // Delete Old Image From Cloudinary
      await deleteFromCloudinary(user[0]?.picture_id!);

      // Upload To Cloudinary
      const { secure_url, public_id } = await uploadToCloudinary(
        filePath,
        `users/${username}-${email}`,
      );

      // Helper To Remove Local Pics from Local Device

      removePicsFromLocal(req.file?.path || "");

      // Update User
      await db
        .update(User)
        .set({
          picture_url: secure_url,
          picture_id: public_id,
        })
        .where(eq(User.id, userId));

      return res
        .status(StatusCodes.OK)
        .json(new ApiResponse(true, "Profile Updated Successfully", null));
    }

    const checkONEmailExistence = await db
      .select()
      .from(User)
      .where(eq(User.email, email));
    if (checkONEmailExistence.length > 0)
      return res
        .status(StatusCodes.CONFLICT)
        .json(new ApiResponse(false, "Email Already Exist", null));

    console.log(email && user[0]?.email);
    const updatedUser = await db
      .update(User)
      .set({
        email: email ?? user[0]?.email, // use new email if provided, else keep old
        username: username ?? user[0]?.username, // use new username if provided, else keep old
      })
      .where(eq(User.id, userId));
    if (!updatedUser)
      return res
        .status(StatusCodes.BAD_REQUEST)
        .json(new ApiResponse(false, "Something Went Wrong", null));

    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Profile Updated Successfully", updateUser));
  },
);

export const refreshAccessToken = asyncHandler(
  async (req: any, res: Response, next: NextFunction) => {
    const id = req.user?.id;
    const user = await db.select().from(User).where(eq(User.id, id));
    const refreshToken = user[0]?.RefreshToken;
    if (!refreshToken) return next(new ApiError("Unauthorized", 401));
    const verifyRefreshToken = jwt.verify(
      refreshToken,
      ENV.REFRESH_TOKEN_SECRET,
    );
    if (!verifyRefreshToken)
      return next(new ApiError("Unauthorized or Expired", 401));
    const accessToken = generateAccessToken({ id: user[0]?.id });
    const newRefreshToken = generateRefreshToken({ id: user[0]?.id });
    await db
      .update(User)
      .set({ RefreshToken: newRefreshToken })
      .where(eq(User.id, id));
    res.cookie("accessToken", accessToken, {
      maxAge: Number(ENV.ACCESS_TOKEN_EXPIRY),
      httpOnly: true,
      secure: true,
    });
    return res
      .status(StatusCodes.OK)
      .json(new ApiResponse(true, "Access Token Updated", null));
  },
);

// export const googleCallback = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     Passport.authenticate(
//       "google",
//       {
//         failureRedirect: "/login",
//         successRedirect: "/api/v1/auth/dashboard",
//       },
//       async (error, profile) => {
//         if (error)
//           return res
//             .status(StatusCodes.BAD_REQUEST)
//             .json(
//               new ApiError("Something Went Wrong", StatusCodes.BAD_REQUEST),
//             );
//         if (!profile) return res.redirect("/api/v1/auth/login");

//         let user: any = await db
//           .select()
//           .from(User)
//           .where(eq(User.email, profile.emails[0].value));

//         if (user.length === 0) {
//           user = await db
//             .insert(User)
//             .values({
//               email: profile.emails[0].value,
//               username: profile.displayName,
//               picture_url: profile.photos[0].value,
//               isOnline: true,
//               googleId: profile.id,

//             })
//             .$returningId();
//         }
//         req.logIn(user[0].id, (err) => {
//           console.log(err);
//           if (err) return res.redirect("/api/v1/auth/login");
//           return res.redirect("/api/v1/auth/dashboard");
//         });
//       },
//     )(req, res, next);
//   },
// );

// export const googleLogout = asyncHandler(
//   async (req: Request, res: Response, next: NextFunction) => {
//     req.logout(function (err) {
//       if (err) {
//         return next(
//           new ApiError("Something Went Wrong", StatusCodes.BAD_REQUEST),
//         );
//       }
//       return res
//         .status(StatusCodes.OK)
//         .json(new ApiResponse(true, "Logout Success", null));
//     });
//   },
// );
