import { NextRequest, NextResponse } from "next/server";
import { signJWT } from "@/lib/auth";
import { createUser, getUserByUsername } from "@/lib/db";
import { getDB } from "@/lib/get-db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { username?: string };
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: "Vyplňte uživatelské jméno." }, { status: 400 });
    }
    if (username.trim().length < 2 || username.trim().length > 30) {
      return NextResponse.json({ error: "Jméno musí mít 2–30 znaků." }, { status: 400 });
    }

    const db = await getDB();
    const existing = await getUserByUsername(db, username.trim());
    if (existing) {
      return NextResponse.json({ error: "Toto jméno je již obsazeno." }, { status: 409 });
    }

    const userId = await createUser(db, username.trim());
    const token = await signJWT({ userId, username: username.trim() });

    const response = NextResponse.json({ ok: true, username: username.trim() });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Register error:", err);
    return NextResponse.json({ error: "Interní chyba serveru." }, { status: 500 });
  }
}
