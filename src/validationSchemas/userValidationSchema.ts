import z from "zod";

export const registerSchema = z.object({
  email: z

    .email("Enter a valid email")
    .nonempty("Email is required")
    .max(50, "Email must be at most 50 characters long"),
  username: z
    .string("Enter a valid username")
    .nonempty("Username is required")
    .min(3, "Username must be at least 3 characters long")
    .max(50, "Username must be at most 50 characters long"),
  password: z
    .string("Enter a valid password")
    .nonempty("Password is required")
    .min(8, "Password must be at least 8 characters long")
    .max(50, "Password must be at most 50 characters long")
    .regex(
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm,
      "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
    ),
  picture: z.string().optional(),
});

export const loginSchema = z.object({
  email: z
    .email("Enter a valid email")
    .nonempty("Email is required")
    .max(50, "Email must be at most 50 characters long"),
  password: z
    .string("Enter a valid password")
    .nonempty("Password is required")
    .min(8, "Password must be at least 8 characters long")
    .max(50, "Password must be at most 50 characters long")
    .regex(
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm,
      "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
    ),
});

export const forgotPassowrdSchema = z.object({
  email: z
    .email("Enter a valid email")
    .nonempty("Email is required")
    .max(50, "Email must be at most 50 characters long"),
});

export const verifyOtpSchema = z.object({
  otp: z
    .string("Enter a valid OTP")
    .nonempty("OTP is required")
    .length(6, "OTP must be 6 characters long")
    .nonempty("OTP is required"),
});

export const resetpasswordSchema = z.object({
  password: z
    .string("Enter a valid password")
    .nonempty("Password is required")
    .min(8, "Password must be at least 8 characters long")
    .max(50, "Password must be at most 50 characters long")
    .regex(
      /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/gm,
      "Password must contain at least one uppercase letter, one lowercase letter, one number and one special character",
    ),
});

export const updateProfileSchema = z.object({
  username: z
    .string("Enter a valid username")
    .min(3, "Username must be at least 3 characters long")
    .max(50, "Username must be at most 50 characters long")
    .optional(),
  picture: z.string().optional(),
  email: z
    .email("Enter a valid email")
    .max(50, "Email must be at most 50 characters long")
    .optional(),
});
