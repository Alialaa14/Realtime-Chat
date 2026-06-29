import {
  mysqlTable,
  int,
  varchar,
  boolean,
  timestamp,
} from "drizzle-orm/mysql-core";

const Contact = mysqlTable("contacts", {
  contactId: int().autoincrement().primaryKey().notNull(),
  userId: int().notNull(),
  name: varchar({ length: 50 }).notNull(),
  phoneNumber: varchar({ length: 50 }).notNull(),
  usingPlatform: boolean().notNull(),
});

export default Contact;
