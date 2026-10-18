import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://perissos:dev_password@localhost:5433/perissos_restaurant",
  },
  verbose: true,
  strict: true,
});
