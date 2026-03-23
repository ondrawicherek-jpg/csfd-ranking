export interface Film {
  id: number;
  csfd_id: string;
  title: string;
  title_original: string | null;
  year: number | null;
  genres: string[];
  csfd_rating: number | null;
  image_url: string | null;
  csfd_url: string;
  rank_position: number;
  rank_type: string;
}

export interface UserFilm extends Film {
  user_film_id: number | null;
  seen: boolean;
  my_rating: number | null;
  seen_at: string | null;
  skipped: boolean;
}

export interface User {
  id: number;
  username: string;
  created_at: string;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(colName?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

interface D1ExecResult {
  count: number;
  duration: number;
}

function parseFilm(row: Record<string, unknown>): Film {
  let genres: string[] = [];
  try {
    genres = JSON.parse((row.genres as string) || "[]");
  } catch {
    genres = [];
  }
  return {
    id: row.id as number,
    csfd_id: row.csfd_id as string,
    title: row.title as string,
    title_original: row.title_original as string | null,
    year: row.year as number | null,
    genres,
    csfd_rating: row.csfd_rating as number | null,
    image_url: row.image_url as string | null,
    csfd_url: row.csfd_url as string,
    rank_position: row.rank_position as number,
    rank_type: row.rank_type as string,
  };
}

function parseUserFilm(row: Record<string, unknown>): UserFilm {
  const film = parseFilm(row);
  return {
    ...film,
    user_film_id: row.user_film_id as number | null,
    seen: Boolean(row.seen),
    my_rating: row.my_rating as number | null,
    seen_at: row.seen_at as string | null,
    skipped: Boolean(row.skipped),
  };
}

export async function getUserByUsername(db: D1Database, username: string): Promise<User | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE username = ?")
    .bind(username)
    .first<Record<string, unknown>>();
  if (!row) return null;
  return row as unknown as User;
}

export async function createUser(db: D1Database, username: string): Promise<number> {
  const result = await db
    .prepare("INSERT INTO users (username) VALUES (?)")
    .bind(username)
    .run();
  return (result.meta as { last_row_id: number }).last_row_id;
}

export async function getFilmsForRating(db: D1Database, userId: number, limit = 20): Promise<UserFilm[]> {
  const rows = await db
    .prepare(
      `SELECT f.*, uf.id as user_film_id, uf.seen, uf.my_rating, uf.seen_at, uf.skipped
       FROM films f
       LEFT JOIN user_films uf ON f.id = uf.film_id AND uf.user_id = ?
       WHERE uf.id IS NULL OR uf.skipped = 1
       ORDER BY f.rank_position ASC
       LIMIT ?`
    )
    .bind(userId, limit)
    .all<Record<string, unknown>>();
  return rows.results.map(parseUserFilm);
}

export async function getNextFilmForRating(db: D1Database, userId: number): Promise<UserFilm | null> {
  const row = await db
    .prepare(
      `SELECT f.*, uf.id as user_film_id, uf.seen, uf.my_rating, uf.seen_at, uf.skipped
       FROM films f
       LEFT JOIN user_films uf ON f.id = uf.film_id AND uf.user_id = ?
       WHERE uf.id IS NULL OR uf.skipped = 1
       ORDER BY f.rank_position ASC
       LIMIT 1`
    )
    .bind(userId)
    .first<Record<string, unknown>>();
  if (!row) return null;
  return parseUserFilm(row);
}

export async function upsertUserFilm(
  db: D1Database,
  userId: number,
  filmId: number,
  data: { seen?: boolean; my_rating?: number | null; skipped?: boolean }
): Promise<void> {
  const existing = await db
    .prepare("SELECT id FROM user_films WHERE user_id = ? AND film_id = ?")
    .bind(userId, filmId)
    .first<{ id: number }>();

  if (existing) {
    const updates: string[] = ["updated_at = datetime('now')"];
    const values: unknown[] = [];
    if (data.seen !== undefined) { updates.push("seen = ?"); values.push(data.seen ? 1 : 0); }
    if (data.my_rating !== undefined) { updates.push("my_rating = ?"); values.push(data.my_rating); }
    if (data.skipped !== undefined) { updates.push("skipped = ?"); values.push(data.skipped ? 1 : 0); }
    if (data.seen) { updates.push("seen_at = datetime('now')"); }
    values.push(userId, filmId);
    await db
      .prepare(`UPDATE user_films SET ${updates.join(", ")} WHERE user_id = ? AND film_id = ?`)
      .bind(...values)
      .run();
  } else {
    await db
      .prepare(
        `INSERT INTO user_films (user_id, film_id, seen, my_rating, skipped, seen_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .bind(
        userId,
        filmId,
        data.seen ? 1 : 0,
        data.my_rating ?? null,
        data.skipped ? 1 : 0,
        data.seen ? new Date().toISOString() : null
      )
      .run();
  }
}

export async function getUserStats(db: D1Database, userId: number) {
  const stats = await db
    .prepare(
      `SELECT
         COUNT(CASE WHEN seen = 1 THEN 1 END) as seen_count,
         ROUND(AVG(CASE WHEN seen = 1 AND my_rating IS NOT NULL THEN my_rating END), 1) as avg_rating,
         COUNT(CASE WHEN seen = 1 AND my_rating IS NOT NULL THEN 1 END) as rated_count
       FROM user_films
       WHERE user_id = ?`
    )
    .bind(userId)
    .first<{ seen_count: number; avg_rating: number | null; rated_count: number }>();
  return stats || { seen_count: 0, avg_rating: null, rated_count: 0 };
}

export async function getTopRatedFilms(db: D1Database, userId: number, limit = 10): Promise<UserFilm[]> {
  const rows = await db
    .prepare(
      `SELECT f.*, uf.id as user_film_id, uf.seen, uf.my_rating, uf.seen_at, uf.skipped
       FROM films f
       JOIN user_films uf ON f.id = uf.film_id
       WHERE uf.user_id = ? AND uf.seen = 1 AND uf.my_rating IS NOT NULL
       ORDER BY uf.my_rating DESC, uf.seen_at DESC
       LIMIT ?`
    )
    .bind(userId, limit)
    .all<Record<string, unknown>>();
  return rows.results.map(parseUserFilm);
}

export async function getLastSeenFilms(db: D1Database, userId: number, limit = 10): Promise<UserFilm[]> {
  const rows = await db
    .prepare(
      `SELECT f.*, uf.id as user_film_id, uf.seen, uf.my_rating, uf.seen_at, uf.skipped
       FROM films f
       JOIN user_films uf ON f.id = uf.film_id
       WHERE uf.user_id = ? AND uf.seen = 1
       ORDER BY uf.seen_at DESC
       LIMIT ?`
    )
    .bind(userId, limit)
    .all<Record<string, unknown>>();
  return rows.results.map(parseUserFilm);
}

export async function getUserFilmsFiltered(
  db: D1Database,
  userId: number,
  filters: {
    year?: number;
    genre?: string;
    rated?: "yes" | "no" | "all";
    seen?: "yes" | "no" | "all";
    search?: string;
    sort?: "rating_desc" | "rating_asc" | "year_desc" | "year_asc" | "title_asc" | "csfd_desc";
    limit?: number;
    offset?: number;
  }
): Promise<{ films: UserFilm[]; total: number }> {
  const conditions: string[] = ["uf.user_id = ?"];
  const values: unknown[] = [userId];

  if (filters.seen === "yes") { conditions.push("uf.seen = 1"); }
  else if (filters.seen === "no") { conditions.push("(uf.seen = 0 OR uf.id IS NULL)"); }

  if (filters.rated === "yes") { conditions.push("uf.my_rating IS NOT NULL"); }
  else if (filters.rated === "no") { conditions.push("uf.my_rating IS NULL"); }

  if (filters.year) { conditions.push("f.year = ?"); values.push(filters.year); }

  if (filters.genre) {
    conditions.push("f.genres LIKE ?");
    values.push(`%${filters.genre}%`);
  }

  if (filters.search) {
    conditions.push("(f.title LIKE ? OR f.title_original LIKE ?)");
    values.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  const where = conditions.join(" AND ");
  const sortMap: Record<string, string> = {
    rating_desc: "uf.my_rating DESC NULLS LAST",
    rating_asc: "uf.my_rating ASC NULLS LAST",
    year_desc: "f.year DESC NULLS LAST",
    year_asc: "f.year ASC NULLS LAST",
    title_asc: "f.title ASC",
    csfd_desc: "f.csfd_rating DESC NULLS LAST",
  };
  const orderBy = sortMap[filters.sort || "rating_desc"] || sortMap.rating_desc;

  const countRow = await db
    .prepare(
      `SELECT COUNT(*) as total FROM films f
       LEFT JOIN user_films uf ON f.id = uf.film_id AND uf.user_id = ?
       WHERE ${where.replace("uf.user_id = ?", "1=1")}`
    )
    .bind(userId, ...values.slice(1))
    .first<{ total: number }>();

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const rows = await db
    .prepare(
      `SELECT f.*, uf.id as user_film_id, uf.seen, uf.my_rating, uf.seen_at, uf.skipped
       FROM films f
       LEFT JOIN user_films uf ON f.id = uf.film_id AND uf.user_id = ?
       WHERE ${where.replace("uf.user_id = ?", "1=1")}
       ORDER BY ${orderBy}
       LIMIT ? OFFSET ?`
    )
    .bind(userId, ...values.slice(1), limit, offset)
    .all<Record<string, unknown>>();

  return {
    films: rows.results.map(parseUserFilm),
    total: countRow?.total ?? 0,
  };
}

export async function getFilmById(db: D1Database, filmId: number): Promise<Film | null> {
  const row = await db
    .prepare("SELECT * FROM films WHERE id = ?")
    .bind(filmId)
    .first<Record<string, unknown>>();
  if (!row) return null;
  return parseFilm(row);
}

export async function searchFilms(db: D1Database, query: string, limit = 10): Promise<Film[]> {
  const rows = await db
    .prepare(
      `SELECT * FROM films
       WHERE title LIKE ? OR title_original LIKE ?
       ORDER BY rank_position ASC
       LIMIT ?`
    )
    .bind(`%${query}%`, `%${query}%`, limit)
    .all<Record<string, unknown>>();
  return rows.results.map(parseFilm);
}

export async function insertFilm(db: D1Database, film: Omit<Film, "id">): Promise<number> {
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO films (csfd_id, title, title_original, year, genres, csfd_rating, image_url, csfd_url, rank_position, rank_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      film.csfd_id,
      film.title,
      film.title_original,
      film.year,
      JSON.stringify(film.genres),
      film.csfd_rating,
      film.image_url,
      film.csfd_url,
      film.rank_position,
      film.rank_type
    )
    .run();

  if ((result.meta as { last_row_id: number }).last_row_id) {
    return (result.meta as { last_row_id: number }).last_row_id;
  }

  // Film already exists — return existing id
  const existing = await db
    .prepare("SELECT id FROM films WHERE csfd_id = ?")
    .bind(film.csfd_id)
    .first<{ id: number }>();
  return existing!.id;
}
