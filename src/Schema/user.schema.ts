import {
  mysqlTable,
  int,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/mysql-core";

const User = mysqlTable("users", {
  id: int().autoincrement().primaryKey(),
  username: varchar({ length: 50 }).notNull(),
  email: varchar({ length: 50 }).notNull().unique(),
  phoneNumber: varchar({ length: 20 }).notNull(),
  password: varchar("password", { length: 255 })
    .$type<string | null>()
    .default(null),
  googleId: varchar("googleId", { length: 255 })
    .$type<string | null>()
    .unique(),
  isOnline: boolean().notNull().default(false),
  RefreshToken: varchar({ length: 255 }),
  picture_url: varchar({ length: 255 }),
  picture_id: varchar({ length: 255 }),
  otp: varchar({ length: 6 }),
  otpExpiry: timestamp("otpExpiry", { mode: "date" }),
});

export default User;
