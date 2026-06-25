import { defineConfig } from "drizzle-kit";
import {ENV} from "./src/helpers/ENV.ts"

export default defineConfig({
  dialect: 'mysql', // 'mysql' | 'sqlite' | 'turso'
  schema: ['./src/Schema/user.schema.ts'],
  dbCredentials: {
    url: ENV.DATABASE_URL
  }
})
