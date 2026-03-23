import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, getTokenFromRequest } from "@/lib/auth";
import { getUserFilmsFiltered } from "@/lib/db";
import { getDB } from "@/lib/get-db";

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return NextResponse.json({ error: "Nepřihlášen." }, { status: 401 });

  const payload = await verifyJWT(token);
  if (!payload) return NextResponse.json({ error: "Neplatný token." }, { status: 401 });

  const url = new URL(request.url);
  const p = url.searchParams;

  const db = await getDB();
  const result = await getUserFilmsFiltered(db, payload.userId, {
    year: p.get("year") ? parseInt(p.get("year")!) : undefined,
    genre: p.get("genre") || undefined,
    rated: (p.get("rated") as "yes" | "no" | "all") || "all",
    seen: (p.get("seen") as "yes" | "no" | "all") || "all",
    search: p.get("search") || undefined,
    sort: (p.get("sort") as "rating_desc" | "rating_asc" | "year_desc" | "year_asc" | "title_asc" | "csfd_desc") || "rating_desc",
    limit: p.get("limit") ? parseInt(p.get("limit")!) : 50,
    offset: p.get("offset") ? parseInt(p.get("offset")!) : 0,
  });

  return NextResponse.json(result);
}
