"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/components/AuthContext";
import Navigation from "@/components/Navigation";
import FilmCard from "@/components/FilmCard";
import type { UserFilm } from "@/lib/db";

interface Stats {
  seen_count: number;
  avg_rating: number | null;
  rated_count: number;
}

interface DashboardData {
  stats: Stats;
  topRated: UserFilm[];
  lastSeen: UserFilm[];
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/prihlaseni");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      setFetching(true);
      fetch("/api/films/stats")
        .then((r) => r.json())
        .then((d: unknown) => setData(d as DashboardData))
        .catch(console.error)
        .finally(() => setFetching(false));
    }
  }, [user]);

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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Přehled</h1>
            <p className="text-sm text-text-muted">Ahoj, {user.username}</p>
          </div>
          <Link
            href="/hodnoceni"
            className="bg-accent hover:bg-accent-hover text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors"
          >
            Hodnotit
          </Link>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <StatCard
            label="Viděno"
            value={data?.stats.seen_count ?? "—"}
            sub="filmů"
          />
          <StatCard
            label="Průměr"
            value={data?.stats.avg_rating != null ? `${data.stats.avg_rating}%` : "—"}
            sub="hodnocení"
          />
          <StatCard
            label="Hodnoceno"
            value={data?.stats.rated_count ?? "—"}
            sub="filmů"
          />
        </div>

        {fetching && (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {data && (
          <>
            {/* Top rated */}
            {data.topRated.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-text-primary">Nejlépe hodnocené</h2>
                  <Link href="/moje-filmy?sort=rating_desc" className="text-xs text-accent">
                    Vše
                  </Link>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {data.topRated.slice(0, 6).map((film) => (
                    <FilmCard key={film.id} film={film} showMyRating />
                  ))}
                </div>
              </section>
            )}

            {/* Last seen */}
            {data.lastSeen.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-base font-semibold text-text-primary">Naposledy viděné</h2>
                  <Link href="/moje-filmy?seen=yes" className="text-xs text-accent">
                    Vše
                  </Link>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {data.lastSeen.slice(0, 6).map((film) => (
                    <FilmCard key={film.id} film={film} showMyRating />
                  ))}
                </div>
              </section>
            )}

            {data.topRated.length === 0 && data.lastSeen.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-4">🎬</p>
                <p className="text-text-secondary text-sm">Zatím žádné filmy.</p>
                <Link
                  href="/hodnoceni"
                  className="inline-block mt-4 bg-accent text-white text-sm font-medium px-6 py-2.5 rounded-xl"
                >
                  Začít hodnotit
                </Link>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="bg-bg-card rounded-2xl p-4 text-center">
      <p className="text-xs text-text-muted mb-1">{label}</p>
      <p className="text-xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted">{sub}</p>
    </div>
  );
}
