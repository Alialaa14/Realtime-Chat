import { Router } from "express";
import { isAuthenticated } from "../Middlewares/isAuthenticated.ts";
import {
  register,
  login,
  logout,
  resetPassword,
  forgotPassword,
  verifyOtp,
  updateUser,
  googleLogout,
  refreshAccessToken,
} from "../Controllers/user.controllers.ts";
import { upload } from "../utils/multer.ts";
import { validationMiddleware } from "../Middlewares/validationMiddleware.ts";
import {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPassowrdSchema,
  resetpasswordSchema,
  updateProfileSchema,
} from "../validationSchemas/userValidationSchema.ts";
import { Passport } from "../utils/googleoAuth.ts";
import { googleCallback } from "../Controllers/user.controllers.ts";
import { isAuthenticatedRefreshToken } from "../Middlewares/isAuthenticatedRefreshToken.ts";

const router = Router();

router.post(
  "/register",
  upload.single("picture"),
  validationMiddleware(registerSchema),
  register,
);
router.post("/login", validationMiddleware(loginSchema), login);
router.post(
  "/forgot-password",
  validationMiddleware(forgotPassowrdSchema),
  forgotPassword,
);
router.post("/verify-otp", validationMiddleware(verifyOtpSchema), verifyOtp);
router.post(
  "/reset-password",
  validationMiddleware(resetpasswordSchema),
  resetPassword,
);
router.post("/logout", isAuthenticated, logout);
router.patch(
  "/update-profile",
  isAuthenticated,
  upload.single("picture"),
  validationMiddleware(updateProfileSchema),
  updateUser,
);

router.post("/refresh-token", isAuthenticatedRefreshToken, refreshAccessToken);

router.get(
  "/google-auth-login",
  Passport.authenticate("google", { scope: ["email", "profile"] }),
);

router.get("/google/callback", googleCallback);
router.get("/google-auth-logout", isAuthenticated, googleLogout);

router.get("/dashboard", isAuthenticated, (req, res, next) => {
  return res.json(req.user);
});

export default router;
