import type { D1Database } from "./db";

export interface CloudflareEnv {
  DB: D1Database;
  JWT_SECRET?: string;
}

// Helper to get CF env from Next.js request in edge runtime
// Works with @cloudflare/next-on-pages
export function getDB(request: Request): D1Database {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (request as any)?.cf?.env ||
    (globalThis as Record<string, unknown>).__env__ ||
    (process as { env: Record<string, unknown> }).env;

  if (env?.DB) return env.DB as D1Database;
  throw new Error("D1 database not available. Are you running on Cloudflare Pages?");
}
