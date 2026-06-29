import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  boolean,
} from "drizzle-orm/mysql-core";

const Message = mysqlTable("messages", {
  messageID: int().autoincrement().primaryKey().notNull(),
  conversationId: int().notNull(),
  content: varchar({ length: 200 }),
  media_url: varchar({ length: 500 }),
  media_size: int(),
  media_type: varchar({ length: 50 }),
  operatedAt: timestamp().notNull(),
  isSent: boolean().default(false),
});

export default Message;
