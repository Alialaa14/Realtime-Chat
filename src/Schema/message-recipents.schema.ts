import { mysqlTable, int, boolean, timestamp } from "drizzle-orm/mysql-core";

const Recipients = mysqlTable("messageRecipients", {
  messageId: int().notNull(),
  sender: int().notNull(),
  reciever: int(),
  isDelieverd: boolean().default(false),
  isRead: boolean().default(false),
  readAt: timestamp(),
  delieveredAt: timestamp(),
});

export default Recipients;
