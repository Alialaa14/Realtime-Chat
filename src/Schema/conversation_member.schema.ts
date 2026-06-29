import {
  mysqlTable,
  int,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/mysql-core";

const Members = mysqlTable("conversation-memb", {
  conversationId: int().notNull(),
  userId: int().notNull(),
  joindAt: timestamp().notNull(),
  leftAt: timestamp(),
  admin: boolean().default(false),
});

export default Members;
