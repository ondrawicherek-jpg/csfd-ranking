"use client";

import { useRef, useCallback, forwardRef, useImperativeHandle } from "react";
import { motion, useMotionValue, useTransform, useAnimation } from "framer-motion";
import Image from "next/image";
import type { UserFilm } from "@/lib/db";
import { CsfdRatingBadge } from "./FilmCard";

interface SwipeCardProps {
  film: UserFilm;
  onSeen: (film: UserFilm) => void;
  onUnseen: (film: UserFilm) => void;
  onSkip: (film: UserFilm) => void;
  isTop: boolean;
}

export interface SwipeCardHandle {
  flyOut: (dir: "left" | "right") => Promise<void>;
}

const SWIPE_THRESHOLD = 100;

const SwipeCard = forwardRef<SwipeCardHandle, SwipeCardProps>(
  ({ film, onSeen, onUnseen, onSkip, isTop }, ref) => {
    const x = useMotionValue(0);
    const rotate = useTransform(x, [-300, 0, 300], [-25, 0, 25]);
    const seenOpacity = useTransform(x, [20, SWIPE_THRESHOLD], [0, 1]);
    const unseenOpacity = useTransform(x, [-SWIPE_THRESHOLD, -20], [1, 0]);
    const controls = useAnimation();
    const handled = useRef(false);

    const flyOutInternal = useCallback(
      async (direction: "left" | "right") => {
        await controls.start({
          x: direction === "right" ? 600 : -600,
          rotate: direction === "right" ? 20 : -20,
          opacity: 0,
          transition: { duration: 0.3, ease: "easeOut" },
        });
      },
      [controls]
    );

    useImperativeHandle(ref, () => ({
      flyOut: async (dir) => {
        if (handled.current) return;
        handled.current = true;
        await flyOutInternal(dir);
      },
    }));

    const handleDragEnd = useCallback(
      async (_: unknown, info: { offset: { x: number } }) => {
        if (handled.current) return;
        const offsetX = info.offset.x;
        if (offsetX > SWIPE_THRESHOLD) {
          handled.current = true;
          await flyOutInternal("right");
          onSeen(film);
        } else if (offsetX < -SWIPE_THRESHOLD) {
          handled.current = true;
          await flyOutInternal("left");
          onUnseen(film);
        } else {
          controls.start({ x: 0, rotate: 0, transition: { type: "spring", stiffness: 300, damping: 20 } });
        }
      },
      [controls, film, onSeen, onUnseen, flyOutInternal]
    );

    void onSkip; // skip is handled by parent without card animation

    const genres = Array.isArray(film.genres) ? film.genres.slice(0, 3) : [];

    return (
      <motion.div
        className="absolute inset-0 no-select"
        style={{ x, rotate }}
        animate={controls}
        drag={isTop ? "x" : false}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.7}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: "grabbing" }}
      >
        <motion.div
          className="absolute top-6 left-6 z-10 bg-seen text-white text-lg font-black px-4 py-1.5 rounded-xl border-2 border-white rotate-[-15deg]"
          style={{ opacity: seenOpacity }}
        >
          VIDĚL
        </motion.div>
        <motion.div
          className="absolute top-6 right-6 z-10 bg-unseen text-white text-lg font-black px-4 py-1.5 rounded-xl border-2 border-white rotate-[15deg]"
          style={{ opacity: unseenOpacity }}
        >
          NEVIDĚL
        </motion.div>

        <div className="w-full h-full bg-bg-card rounded-3xl overflow-hidden shadow-2xl flex flex-col">
          <div className="relative flex-1 bg-bg-hover">
            {film.image_url ? (
              <Image src={film.image_url} alt={film.title} fill className="object-cover"
                sizes="(max-width: 640px) 100vw, 480px" priority unoptimized />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-6xl">🎬</span>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-bg-card to-transparent" />
          </div>
          <div className="px-5 pb-5 pt-2">
            <h2 className="text-xl font-bold text-text-primary leading-tight">{film.title}</h2>
            {film.title_original && film.title_original !== film.title && (
              <p className="text-sm text-text-muted">{film.title_original}</p>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {film.year && <span className="text-sm text-text-secondary">{film.year}</span>}
              {genres.length > 0 && <span className="text-sm text-text-muted">· {genres.join(", ")}</span>}
            </div>
            <div className="mt-2"><CsfdRatingBadge rating={film.csfd_rating} /></div>
          </div>
        </div>
      </motion.div>
    );
  }
);

SwipeCard.displayName = "SwipeCard";
export default SwipeCard;
