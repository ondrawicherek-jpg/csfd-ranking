"use client";

import Image from "next/image";
import type { UserFilm } from "@/lib/db";

interface FilmCardProps {
  film: UserFilm | (UserFilm & { my_rating?: number | null });
  compact?: boolean;
  showMyRating?: boolean;
  onClick?: () => void;
}

export function CsfdRatingBadge({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  const color =
    rating >= 80 ? "text-green-400" : rating >= 60 ? "text-yellow-400" : rating >= 40 ? "text-orange-400" : "text-red-400";
  return (
    <span className={`text-xs font-semibold ${color}`}>
      ČSFD {rating}%
    </span>
  );
}

export function MyRatingBadge({ rating }: { rating: number | null }) {
  if (rating === null) return null;
  return (
    <span className="text-xs font-bold text-accent">
      Moje {rating}%
    </span>
  );
}

export default function FilmCard({ film, compact, showMyRating, onClick }: FilmCardProps) {
  const genres = Array.isArray(film.genres) ? film.genres.slice(0, 2) : [];

  if (compact) {
    return (
      <div
        className="flex gap-3 items-center bg-bg-card rounded-xl p-3 cursor-pointer hover:bg-bg-hover transition-colors"
        onClick={onClick}
      >
        <div className="relative w-10 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-bg-hover">
          {film.image_url ? (
            <Image
              src={film.image_url}
              alt={film.title}
              fill
              className="object-cover"
              sizes="40px"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">?</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{film.title}</p>
          <p className="text-xs text-text-muted">
            {film.year}
            {genres.length > 0 && ` · ${genres.join(", ")}`}
          </p>
          <div className="flex gap-2 mt-0.5">
            <CsfdRatingBadge rating={film.csfd_rating} />
            {showMyRating && <MyRatingBadge rating={film.my_rating} />}
          </div>
        </div>
        {film.seen && (
          <span className="text-seen text-xs flex-shrink-0">✓</span>
        )}
      </div>
    );
  }

  return (
    <div
      className="bg-bg-card rounded-2xl overflow-hidden cursor-pointer hover:bg-bg-hover transition-colors"
      onClick={onClick}
    >
      <div className="relative w-full aspect-[2/3] bg-bg-hover">
        {film.image_url ? (
          <Image
            src={film.image_url}
            alt={film.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, 200px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-muted">
            <span className="text-4xl">🎬</span>
          </div>
        )}
        {/* Moje hodnocení — badge přes plakát */}
        {showMyRating && film.my_rating != null && (
          <div className="absolute top-2 left-2 bg-accent/90 text-white text-xs font-bold px-2 py-0.5 rounded-lg">
            {film.my_rating}%
          </div>
        )}
        {/* Seen badge */}
        {film.seen && (
          <div className="absolute top-2 right-2 bg-seen/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
            ✓
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-semibold text-text-primary leading-tight truncate">{film.title}</p>
        <p className="text-[10px] text-text-muted mt-0.5 truncate">
          {film.year}
        </p>
        <div className="mt-0.5">
          <CsfdRatingBadge rating={film.csfd_rating} />
        </div>
      </div>
    </div>
  );
}
