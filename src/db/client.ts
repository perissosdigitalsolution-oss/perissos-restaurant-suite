import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema.js";

const connectionString =
  process.env.DATABASE_URL ?? "postgres://perissos:dev_password@localhost:5433/perissos_restaurant";

const pool = new Pool({ connectionString });

export const db = drizzle(pool, { schema });
