"use client";

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import Navigation from "@/components/Navigation";
import FilmCard from "@/components/FilmCard";
import RatingModal from "@/components/RatingModal";
import type { UserFilm } from "@/lib/db";

type SortKey = "rating_desc" | "rating_asc" | "year_desc" | "year_asc" | "title_asc" | "csfd_desc";

const GENRES = [
  "Akční", "Animovaný", "Dokumentární", "Drama", "Fantasy", "Horor",
  "Komedie", "Krimi", "Muzikál", "Romantický", "Sci-Fi", "Thriller", "Western",
];

const SORT_LABELS: Record<SortKey, string> = {
  rating_desc: "Moje hodnocení ↓",
  rating_asc: "Moje hodnocení ↑",
  year_desc: "Rok ↓",
  year_asc: "Rok ↑",
  title_asc: "Název A–Z",
  csfd_desc: "ČSFD hodnocení ↓",
};

export default function MojeFilmyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>}>
      <MojeFilmyInner />
    </Suspense>
  );
}

function MojeFilmyInner() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [films, setFilms] = useState<UserFilm[]>([]);
  const [total, setTotal] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [selectedFilm, setSelectedFilm] = useState<UserFilm | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("");
  const [genre, setGenre] = useState("");
  const [seen, setSeen] = useState<"all" | "yes" | "no">(
    (searchParams.get("seen") as "all" | "yes" | "no") || "all"
  );
  const [rated, setRated] = useState<"all" | "yes" | "no">("all");
  const [sort, setSort] = useState<SortKey>(
    (searchParams.get("sort") as SortKey) || "rating_desc"
  );
  const [showFilters, setShowFilters] = useState(false);

  // Add film search
  const [addQuery, setAddQuery] = useState("");
  const [addResults, setAddResults] = useState<UserFilm[]>([]);
  const [addSearching, setAddSearching] = useState(false);
  const [addNoResults, setAddNoResults] = useState(false);
  const addTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!loading && !user) router.replace("/prihlaseni");
  }, [user, loading, router]);

  const fetchFilms = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (year) params.set("year", year);
    if (genre) params.set("genre", genre);
    if (seen !== "all") params.set("seen", seen);
    if (rated !== "all") params.set("rated", rated);
    params.set("sort", sort);
    params.set("limit", "60");

    try {
      const res = await fetch(`/api/films/my?${params}`);
      const data = await res.json() as { films?: UserFilm[]; total?: number };
      setFilms(data.films || []);
      setTotal(data.total || 0);
    } catch {
      //
    } finally {
      setFetching(false);
    }
  }, [user, search, year, genre, seen, rated, sort]);

  useEffect(() => {
    fetchFilms();
  }, [fetchFilms]);

  const handleAddSearch = (q: string) => {
    setAddQuery(q);
    setAddNoResults(false);
    clearTimeout(addTimeout.current);
    if (q.length < 2) { setAddResults([]); return; }
    addTimeout.current = setTimeout(async () => {
      setAddSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json() as { films?: UserFilm[] };
        const results = data.films || [];
        setAddResults(results);
        setAddNoResults(results.length === 0);
      } catch {
        setAddNoResults(true);
      } finally {
        setAddSearching(false);
      }
    }, 400);
  };

  const handleSaveRating = async (filmId: number, rating: number | null, seen: boolean) => {
    await fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filmId,
        action: seen ? "seen" : "unseen",
        rating,
      }),
    });
    setSelectedFilm(null);
    fetchFilms();
  };

  const openFilm = (film: UserFilm) => setSelectedFilm(film);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pt-14">
      <Navigation />

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Moje filmy</h1>
            <p className="text-xs text-text-muted">{total} filmů</p>
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`text-sm font-medium px-3 py-1.5 rounded-xl border transition-colors ${
              showFilters
                ? "bg-accent/10 border-accent/40 text-accent"
                : "border-border text-text-muted hover:bg-bg-hover"
            }`}
          >
            Filtry
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Hledat v mých filmech..."
            className="w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-accent transition-colors pl-10"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">🔍</span>
        </div>

        {/* Quick seen/unseen filter — always visible */}
        <div className="flex gap-2 mb-4">
          {(["all", "yes", "no"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setSeen(v)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                seen === v
                  ? "bg-accent/15 border-accent/40 text-accent"
                  : "border-border text-text-muted hover:bg-bg-hover"
              }`}
            >
              {v === "all" ? "Vše" : v === "yes" ? "✓ Viděl" : "✗ Neviděl"}
            </button>
          ))}
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-bg-card rounded-2xl p-4 mb-4 space-y-4">
            {/* Seen filter */}
            <div>
              <p className="text-xs text-text-muted mb-2">Stav sledování</p>
              <div className="flex gap-2">
                {(["all", "yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setSeen(v)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      seen === v
                        ? "bg-accent/15 border-accent/40 text-accent"
                        : "border-border text-text-muted hover:bg-bg-hover"
                    }`}
                  >
                    {v === "all" ? "Vše" : v === "yes" ? "Viděl" : "Neviděl"}
                  </button>
                ))}
              </div>
            </div>

            {/* Rated filter */}
            <div>
              <p className="text-xs text-text-muted mb-2">Hodnocení</p>
              <div className="flex gap-2">
                {(["all", "yes", "no"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setRated(v)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                      rated === v
                        ? "bg-accent/15 border-accent/40 text-accent"
                        : "border-border text-text-muted hover:bg-bg-hover"
                    }`}
                  >
                    {v === "all" ? "Vše" : v === "yes" ? "Hodnoceno" : "Nehodnoceno"}
                  </button>
                ))}
              </div>
            </div>

            {/* Year */}
            <div>
              <p className="text-xs text-text-muted mb-2">Rok</p>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Např. 1999"
                min={1888}
                max={2030}
                className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              />
            </div>

            {/* Genre */}
            <div>
              <p className="text-xs text-text-muted mb-2">Žánr</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setGenre("")}
                  className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                    genre === ""
                      ? "bg-accent/15 border-accent/40 text-accent"
                      : "border-border text-text-muted hover:bg-bg-hover"
                  }`}
                >
                  Vše
                </button>
                {GENRES.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGenre(g === genre ? "" : g)}
                    className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                      genre === g
                        ? "bg-accent/15 border-accent/40 text-accent"
                        : "border-border text-text-muted hover:bg-bg-hover"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <p className="text-xs text-text-muted mb-2">Řazení</p>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
              >
                {Object.entries(SORT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Add film section */}
        <div className="mb-6">
          <p className="text-xs font-medium text-text-muted mb-2">Přidat film ze ČSFD</p>
          <div className="relative">
            <input
              type="search"
              value={addQuery}
              onChange={(e) => handleAddSearch(e.target.value)}
              placeholder="Vyhledat název filmu na ČSFD..."
              className="w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-sm text-text-primary outline-none focus:border-accent transition-colors pl-10"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm">+</span>
          </div>

          {addSearching && (
            <div className="flex items-center gap-2 py-3 px-1">
              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-xs text-text-muted">Hledám na ČSFD…</span>
            </div>
          )}

          {!addSearching && addNoResults && addQuery.length >= 2 && (
            <p className="text-xs text-text-muted py-2 px-1">Žádné výsledky pro „{addQuery}"</p>
          )}

          {addResults.length > 0 && (
            <div className="mt-2 bg-bg-card rounded-2xl overflow-hidden border border-border">
              {addResults.map((film) => (
                <button
                  key={film.id}
                  onClick={() => {
                    setSelectedFilm(film);
                    setAddQuery("");
                    setAddResults([]);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-bg-hover transition-colors border-b border-border last:border-0 text-left"
                >
                  {film.image_url && (
                    <img
                      src={film.image_url}
                      alt={film.title}
                      className="w-8 h-11 rounded object-cover flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{film.title}</p>
                    <p className="text-xs text-text-muted">
                      {film.year}
                      {film.csfd_rating != null && ` · ČSFD ${film.csfd_rating}%`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Films grid */}
        {fetching ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : films.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">🎬</p>
            <p className="text-text-muted text-sm">Žádné filmy nesplňují filtr.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {films.map((film) => (
              <FilmCard
                key={film.id}
                film={film}
                showMyRating
                onClick={() => openFilm(film)}
              />
            ))}
          </div>
        )}
      </main>

      {selectedFilm && (
        <RatingModal
          film={selectedFilm}
          onClose={() => setSelectedFilm(null)}
          onSave={handleSaveRating}
        />
      )}
    </div>
  );
}
