import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, getTokenFromRequest } from "@/lib/auth";
import { getUserStats, getTopRatedFilms, getLastSeenFilms } from "@/lib/db";
import { getDB } from "@/lib/get-db";

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const payload = await verifyJWT(token);
  if (!payload) return NextResponse.json({ error: "Neplatný token." }, { status: 401 });

  const db = await getDB();
  const [stats, topRated, lastSeen] = await Promise.all([
    getUserStats(db, payload.userId),
    getTopRatedFilms(db, payload.userId, 10),
    getLastSeenFilms(db, payload.userId, 10),
  ]);

  return NextResponse.json({ stats, topRated, lastSeen });
}
