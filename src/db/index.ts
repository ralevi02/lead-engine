import { neon, neonConfig } from "@neondatabase/serverless";
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
neonConfig.fetchConnectionCache = true;
const sql = neon(cleanConnectionString(process.env.DATABASE_URL!));

export const db = drizzle(sql, { schema });

/**
 * Retry a DB operation up to `attempts` times with exponential backoff.
 * Handles transient ETIMEDOUT / fetch-failed errors from Neon free tier.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 300
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const isTransient =
        err instanceof Error &&
        (err.message.includes("ETIMEDOUT") ||
          err.message.includes("fetch failed") ||
          err.message.includes("Failed query"));
      if (!isTransient || i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, delayMs * 2 ** i));
    }
  }
  throw lastError;
}

