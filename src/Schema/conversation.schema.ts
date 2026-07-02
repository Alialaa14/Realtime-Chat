import {
  mysqlTable,
  int,
  boolean,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

const Conversation = mysqlTable("conversation", {
  conversationId: int().primaryKey().notNull().autoincrement(),
  type: varchar({ length: 5, enum: ["chat", "group"] }).notNull(),
  description: varchar({ length: 255 }),
  group_pic: varchar({ length: 255 }),
  group_pic_id: varchar({ length: 255 }),
  group_name: varchar({ length: 30 }).notNull(),
  adminsOnly: boolean().default(false),
});

export default Conversation;
