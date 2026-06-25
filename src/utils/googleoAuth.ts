import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
import { ENV } from "../helpers/ENV.ts";
import { db } from "../index.ts";
import User from "../Schema/user.schema.ts";
import { eq } from "drizzle-orm";

passport.use(
  new GoogleStrategy(
    {
      clientID: ENV.CLIENT_ID,
      clientSecret: ENV.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/api/v1/auth/google/callback",
    },
    function (accessToken, refreshToken, user, done) {
      return done(null, user);
    },
  ),
);

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(async function (id: number, done) {
  try {
    const user = await db.select().from(User).where(eq(User.id, id));
    done(null, user);
  } catch (error) {
    console.log(error);
    done(error, null);
  }
});

export const Passport = passport;
