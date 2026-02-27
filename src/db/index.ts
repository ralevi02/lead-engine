import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

// Neon's channel_binding param is not understood by the HTTP driver — strip it.
function cleanConnectionString(url: string): string {
  const [base, qs] = url.split("?");
  if (!qs) return url;
  const params = qs
    .split("&")
    .filter((p) => !p.startsWith("channel_binding"))
    .join("&");
  return params ? `${base}?${params}` : base;
}

// HTTP driver: creates a fresh connection per query — no stale pool issues.
// This is the recommended approach for Next.js + Neon (serverless environment).
const sql = neon(cleanConnectionString(process.env.DATABASE_URL!));

export const db = drizzle(sql, { schema });

