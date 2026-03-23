import type { D1Database } from "./db";

/**
 * Returns the D1 database — either from Cloudflare context (production)
 * or from local better-sqlite3 (development).
 */
export async function getDB(): Promise<D1Database> {
  if (process.env.NODE_ENV === "development") {
    const { localDB } = await import("./local-db");
    return localDB;
  }

  // Production: Cloudflare Pages
  const { getRequestContext } = await import("@cloudflare/next-on-pages");
  const { env } = getRequestContext();
  return (env as { DB: D1Database }).DB;
}
