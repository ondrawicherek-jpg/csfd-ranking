/**
 * Local SQLite fallback for development (uses better-sqlite3).
 * On Cloudflare Pages, D1 is used instead.
 */
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import type { D1Database } from "./db";

const DB_PATH = path.join(process.cwd(), ".local-db", "csfd.sqlite");

function getLocalDatabase(): Database.Database {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  ensureSchema(db);
  return db;
}

function ensureSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS films (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      csfd_id TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      title_original TEXT,
      year INTEGER,
      genres TEXT NOT NULL DEFAULT '[]',
      csfd_rating INTEGER,
      image_url TEXT,
      csfd_url TEXT NOT NULL,
      rank_position INTEGER NOT NULL DEFAULT 9999,
      rank_type TEXT NOT NULL DEFAULT 'best',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS user_films (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      film_id INTEGER NOT NULL REFERENCES films(id) ON DELETE CASCADE,
      seen INTEGER NOT NULL DEFAULT 0,
      my_rating INTEGER,
      seen_at TEXT,
      skipped INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, film_id)
    );
    CREATE INDEX IF NOT EXISTS idx_user_films_user ON user_films(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_films_film ON user_films(film_id);
    CREATE INDEX IF NOT EXISTS idx_films_rank ON films(rank_position, rank_type);
  `);
}

let _db: Database.Database | null = null;
function getSqlite(): Database.Database {
  if (!_db) _db = getLocalDatabase();
  return _db;
}

// D1-compatible wrapper around better-sqlite3
class LocalPrepared {
  private stmt: Database.Statement;
  private bindings: unknown[] = [];

  constructor(query: string) {
    // D1 uses ? placeholders, better-sqlite3 uses ? too — compatible
    this.stmt = getSqlite().prepare(query);
  }

  bind(...values: unknown[]): LocalPrepared {
    this.bindings = values;
    return this;
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const result = this.stmt.get(...(this.bindings as Parameters<typeof this.stmt.get>)) as T | undefined;
    if (!result) return null;
    if (colName) return (result as Record<string, unknown>)[colName] as T;
    return result;
  }

  async all<T = Record<string, unknown>>(): Promise<{ results: T[] }> {
    const results = this.stmt.all(...(this.bindings as Parameters<typeof this.stmt.all>)) as T[];
    return { results };
  }

  async run(): Promise<{ meta: { last_row_id: number; changes: number } }> {
    const info = this.stmt.run(...(this.bindings as Parameters<typeof this.stmt.run>));
    return { meta: { last_row_id: info.lastInsertRowid as number, changes: info.changes } };
  }
}

export const localDB: D1Database = {
  prepare(query: string) {
    return new LocalPrepared(query) as unknown as ReturnType<D1Database["prepare"]>;
  },
  async exec(query: string) {
    getSqlite().exec(query);
    return { count: 0, duration: 0 };
  },
};
