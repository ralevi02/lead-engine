import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

// pg doesn't support Neon's `channel_binding` param — strip it so the
// connection string only contains params pg actually understands.
function cleanConnectionString(url: string): string {
  const [base, qs] = url.split("?");
  if (!qs) return url;
  const params = qs
    .split("&")
    .filter((p) => !p.startsWith("channel_binding"))
    .join("&");
  return params ? `${base}?${params}` : base;
}

const pool = new Pool({
  connectionString: cleanConnectionString(process.env.DATABASE_URL!),
  ssl: { rejectUnauthorized: false },
  max: 3,
  idleTimeoutMillis: 20_000,
  connectionTimeoutMillis: 15_000,
  allowExitOnIdle: false,
});

// Prevent unhandled pool errors from crashing the process
pool.on("error", (err) => {
  console.error("[pg pool] idle client error:", err.message);
});

export const db = drizzle(pool, { schema });
