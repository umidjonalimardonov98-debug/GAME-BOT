import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("[DB] WARNING: DATABASE_URL is not set. Database features will not work.");
}

export const pool = new Pool({
  connectionString: DATABASE_URL || "postgresql://localhost/placeholder",
  max: 10,
  min: 0,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});
export const db = drizzle(pool, { schema });

export * from "./schema";
