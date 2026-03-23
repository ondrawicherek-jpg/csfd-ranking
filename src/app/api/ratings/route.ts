import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, getTokenFromRequest } from "@/lib/auth";
import { upsertUserFilm, getFilmById } from "@/lib/db";
import { getDB } from "@/lib/get-db";

export async function POST(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const payload = await verifyJWT(token);
  if (!payload) return NextResponse.json({ error: "Neplatný token." }, { status: 401 });

  const body = await request.json() as { filmId?: number; action?: string; rating?: number | null };
  const { filmId, action, rating } = body;

  if (!filmId || !action) {
    return NextResponse.json({ error: "Chybí filmId nebo action." }, { status: 400 });
  }

  const db = await getDB();
  const film = await getFilmById(db, filmId);
  if (!film) return NextResponse.json({ error: "Film nenalezen." }, { status: 404 });

  if (action === "seen") {
    await upsertUserFilm(db, payload.userId, filmId, {
      seen: true,
      my_rating: typeof rating === "number" ? rating : null,
      skipped: false,
    });
  } else if (action === "unseen") {
    await upsertUserFilm(db, payload.userId, filmId, {
      seen: false,
      my_rating: null,
      skipped: false,
    });
  } else if (action === "skip") {
    await upsertUserFilm(db, payload.userId, filmId, {
      seen: false,
      skipped: true,
    });
  } else if (action === "rate") {
    await upsertUserFilm(db, payload.userId, filmId, {
      seen: true,
      my_rating: typeof rating === "number" ? rating : null,
    });
  } else {
    return NextResponse.json({ error: "Neznámá akce." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
