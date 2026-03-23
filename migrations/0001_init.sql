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
  rank_position INTEGER,
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
