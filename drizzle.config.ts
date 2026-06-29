import { defineConfig } from "drizzle-kit";
import { ENV } from "./src/helpers/ENV.ts";

export default defineConfig({
  dialect: "mysql", // 'mysql' | 'sqlite' | 'turso'
  schema: [
    "./src/Schema/user.schema.ts",
    "./src/Schema/message.schema.ts",
    "./src/Schema/conversation_member.schema.ts",
    "./src/Schema/conversation.schema.ts",
    "./src/Schema/message-recipents.schema.ts",
    "./src/Schema/Contacts.schema.ts",
  ],
  dbCredentials: {
    url: ENV.DATABASE_URL,
  },
});
