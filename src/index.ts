import express from "express";
import { connectDatabase } from "./helpers/connectdb.ts";
import { ENV } from "./helpers/ENV.ts";
import morgan from "morgan";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import { type Request, type Response, type NextFunction } from "express";
import { type ApiErrType } from "./types/ApiError.types.ts";
import userRouter from "./routers/user.router.ts";
import { Passport } from "./utils/googleoAuth.ts";
import { removePicsFromLocal } from "./helpers/removeLocalPics.ts";

const app = express();
app.use(express.json());
app.use(morgan("dev"));
app.use(cors());
app.use(cookieParser());
app.use(
  session({
    secret: ENV.ACCESS_TOKEN_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      sameSite: "lax",
      secure: false,
    },
  }),
);

app.use(Passport.initialize());
app.use(Passport.session());

export const db = await connectDatabase();

app.use("/api/v1/auth", userRouter);
app.use((req: Request, res: Response, next: NextFunction) => {
  return res.status(404).json({ message: "Route not found" });
});
app.use((err: ApiErrType, req: Request, res: Response, next: NextFunction) => {
  if (req.file) {
    removePicsFromLocal(req.file.path);
  }
  return res
    .status(err.statusCode || 500)
    .json({ message: err.message, errorType: err.errorType, success: false });
});

app.listen(ENV.PORT, () => {
  console.log("Server running on port 3000");
});
