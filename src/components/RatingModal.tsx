"use client";

import { useState } from "react";
import type { UserFilm } from "@/lib/db";

interface RatingModalProps {
  film: UserFilm;
  /** If true, hides the seen/unseen toggle (used in Hodnocení, where user already picked Viděl) */
  seenOnly?: boolean;
  onClose: () => void;
  onSave: (filmId: number, rating: number | null, seen: boolean) => void;
}

export default function RatingModal({ film, seenOnly = false, onClose, onSave }: RatingModalProps) {
  const [rating, setRating] = useState<number>(film.my_rating ?? 70);
  const [seen, setSeen] = useState(seenOnly ? true : film.seen);
  const [saving, setSaving] = useState(false);

  const handleSave = async (includeRating: boolean) => {
    setSaving(true);
    onSave(film.id, seen && includeRating ? rating : null, seen);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-md bg-bg-secondary rounded-3xl p-6 pb-8">
        {/* Film info */}
        <div className="flex gap-3 mb-6">
          {film.image_url && (
            <img
              src={film.image_url}
              alt={film.title}
              className="w-12 rounded-lg object-cover flex-shrink-0"
              style={{ height: "72px" }}
            />
          )}
          <div>
            <h3 className="font-semibold text-text-primary">{film.title}</h3>
            <p className="text-sm text-text-muted">
              {film.year}
              {film.csfd_rating != null && ` · ČSFD ${film.csfd_rating}%`}
            </p>
          </div>
        </div>

        {/* Seen toggle — only when not seenOnly */}
        {!seenOnly && (
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setSeen(false)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                !seen
                  ? "bg-unseen/20 border-unseen/40 text-unseen"
                  : "border-border text-text-muted hover:bg-bg-hover"
              }`}
            >
              Neviděl
            </button>
            <button
              onClick={() => setSeen(true)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                seen
                  ? "bg-seen/20 border-seen/40 text-seen"
                  : "border-border text-text-muted hover:bg-bg-hover"
              }`}
            >
              Viděl
            </button>
          </div>
        )}

        {/* Rating slider — shown when seen */}
        {seen && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-text-secondary">Moje hodnocení</span>
              <span className="text-2xl font-bold text-accent">{rating}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value))}
              className="w-full"
              style={{
                background: `linear-gradient(to right, #e63946 ${rating}%, #2a2a2a ${rating}%)`,
              }}
            />
            <div className="flex justify-between text-xs text-text-muted mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-bg-hover transition-colors"
          >
            Zrušit
          </button>
          {seen && (
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 py-3 rounded-xl border border-border text-text-secondary text-sm font-medium hover:bg-bg-hover transition-colors disabled:opacity-50"
            >
              Bez hodnocení
            </button>
          )}
          <button
            onClick={() => handleSave(seen)}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-colors disabled:opacity-50"
          >
            {saving ? "Ukládám..." : seen ? `Uložit ${rating}%` : "Uložit"}
          </button>
        </div>
      </div>
    </div>
  );
}
