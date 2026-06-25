import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { ENV } from "./ENV.js";

export const connectDatabase = async () => {
  const connection = await mysql.createConnection({ uri: ENV.DATABASE_URL });

  const db = drizzle({ client: connection });

  await db.execute("select 1");
  console.log("Database connected");
  return db;
};
