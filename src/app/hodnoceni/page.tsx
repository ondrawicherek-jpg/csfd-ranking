"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import Navigation from "@/components/Navigation";
import SwipeCard, { type SwipeCardHandle } from "@/components/SwipeCard";
import type { UserFilm } from "@/lib/db";

export default function HodnoceniPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<UserFilm[]>([]);
  const [fetching, setFetching] = useState(true);
  const [done, setDone] = useState(false);
  const [rating, setRating] = useState(70);
  const [ratingTouched, setRatingTouched] = useState(false);
  const swipeCardRef = useRef<SwipeCardHandle>(null);

  useEffect(() => {
    if (!loading && !user) router.replace("/prihlaseni");
  }, [user, loading, router]);

  const fetchQueue = useCallback(async () => {
    setFetching(true);
    try {
      const res = await fetch("/api/films/queue");
      const data = await res.json() as { films?: UserFilm[] };
      if (data.films && data.films.length > 0) { setQueue(data.films); setDone(false); }
      else setDone(true);
    } catch { setDone(true); }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { if (user) fetchQueue(); }, [user, fetchQueue]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (queue.length === 0) return;
      if (e.key === "ArrowRight") { e.preventDefault(); doViděl(); }
      if (e.key === "ArrowLeft")  { e.preventDefault(); doNeviděl(); }
      if (e.key === " ")          { e.preventDefault(); doSkip(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const saveRating = (filmId: number, action: string, r?: number | null) =>
    fetch("/api/ratings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filmId, action, rating: r }),
    });

  const removeTop = () => {
    setQueue((prev) => {
      const next = prev.slice(1);
      if (next.length < 5) {
        fetch("/api/films/queue").then(r => r.json()).then((raw: unknown) => {
          const d = raw as { films?: UserFilm[] };
          if (d.films?.length) {
            setQueue(cur => {
              const ids = new Set(cur.map(f => f.id));
              return [...cur, ...d.films!.filter(f => !ids.has(f.id))];
            });
          } else if (next.length === 0) setDone(true);
        });
      }
      if (next.length === 0) setDone(true);
      return next;
    });
  };

  const doViděl = async () => {
    if (!queue.length) return;
    await swipeCardRef.current?.flyOut("right");
    saveRating(queue[0].id, "seen", ratingTouched ? rating : null);
    removeTop();
    setRatingTouched(false);
  };

  const doNeviděl = async () => {
    if (!queue.length) return;
    await swipeCardRef.current?.flyOut("left");
    saveRating(queue[0].id, "unseen");
    removeTop();
    setRatingTouched(false);
  };

  const doSkip = () => {
    if (!queue.length) return;
    saveRating(queue[0].id, "skip");
    removeTop();
    setRatingTouched(false);
  };

  // Called when user swipes right — card already flew out
  const handleSwipeSeen = (film: UserFilm) => {
    saveRating(film.id, "seen", ratingTouched ? rating : null);
    removeTop();
    setRatingTouched(false);
  };

  // Called when user swipes left on card
  const handleSwipeUnseen = (film: UserFilm) => {
    saveRating(film.id, "unseen");
    removeTop();
  };

  if (loading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen pb-20 md:pb-0 md:pt-14 flex flex-col">
      <Navigation />
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-4">
        {fetching && <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />}

        {!fetching && done && (
          <div className="text-center">
            <p className="text-5xl mb-4">🎉</p>
            <h2 className="text-xl font-bold text-text-primary mb-2">Všechno ohodnoceno!</h2>
            <p className="text-text-muted text-sm mb-6">Prošel jsi celý žebříček.</p>
            <button onClick={fetchQueue} className="bg-accent text-white text-sm font-medium px-6 py-2.5 rounded-xl">
              Zkusit znovu
            </button>
          </div>
        )}

        {!fetching && !done && queue.length > 0 && (
          <div className="w-full max-w-sm flex flex-col items-center gap-4">
            {/* Card stack */}
            <div className="relative w-full" style={{ height: "min(60vh, 460px)" }}>
              {queue.slice(1, 3).map((film, i) => (
                <div key={film.id} className="absolute inset-0 rounded-3xl bg-bg-card"
                  style={{ transform: `scale(${1 - (i + 1) * 0.04}) translateY(${(i + 1) * -8}px)`, zIndex: 10 - i }} />
              ))}
              <div className="absolute inset-0" style={{ zIndex: 20 }}>
                <SwipeCard
                  key={queue[0].id}
                  ref={swipeCardRef}
                  film={queue[0]}
                  onSeen={handleSwipeSeen}
                  onUnseen={handleSwipeUnseen}
                  onSkip={doSkip}
                  isTop
                />
              </div>
            </div>

            {/* Rating slider — always visible above buttons */}
            <div className="w-full bg-bg-card rounded-2xl px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">Hodnocení při „Viděl"</span>
                {ratingTouched
                  ? <span className="text-xl font-bold text-accent">{rating}%</span>
                  : <span className="text-xs text-text-muted italic">bez hodnocení</span>
                }
              </div>
              <input
                type="range" min={0} max={100} value={rating}
                onChange={(e) => { setRating(parseInt(e.target.value)); setRatingTouched(true); }}
                className="w-full"
                style={{ background: `linear-gradient(to right, #e63946 ${rating}%, #2a2a2a ${rating}%)` }}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-4 w-full justify-center">
              <ActionButton onClick={doNeviděl} color="unseen" label="Neviděl" icon="✕" />
              <ActionButton onClick={doSkip}    color="muted"  label="Přeskočit" icon="→" small />
              <ActionButton onClick={doViděl}   color="seen"   label="Viděl"    icon="✓" />
            </div>

            <p className="text-xs text-text-muted">← Neviděl · Mezerník Přeskočit · → Viděl</p>
          </div>
        )}
      </main>
    </div>
  );
}

function ActionButton({ onClick, color, label, icon, small }: {
  onClick: () => void; color: "seen" | "unseen" | "muted"; label: string; icon: string; small?: boolean;
}) {
  const colorMap = {
    seen:   "bg-seen/10 border-seen/30 text-seen hover:bg-seen/20",
    unseen: "bg-unseen/10 border-unseen/30 text-unseen hover:bg-unseen/20",
    muted:  "bg-bg-card border-border text-text-muted hover:bg-bg-hover",
  };
  return (
    <button onClick={onClick}
      className={`flex flex-col items-center gap-1 border rounded-2xl transition-colors ${colorMap[color]} ${small ? "px-4 py-2.5" : "px-6 py-3"}`}>
      <span className={small ? "text-lg" : "text-2xl"}>{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
