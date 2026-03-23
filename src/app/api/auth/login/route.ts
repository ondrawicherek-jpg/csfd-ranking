import { NextRequest, NextResponse } from "next/server";
import { signJWT } from "@/lib/auth";
import { getUserByUsername } from "@/lib/db";
import { getDB } from "@/lib/get-db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { username?: string };
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: "Vyplňte uživatelské jméno." }, { status: 400 });
    }

    const db = await getDB();
    const user = await getUserByUsername(db, username);
    if (!user) {
      return NextResponse.json({ error: "Uživatel nenalezen." }, { status: 404 });
    }

    const token = await signJWT({ userId: user.id, username: user.username });

    const response = NextResponse.json({ ok: true, username: user.username });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Interní chyba serveru." }, { status: 500 });
  }
}
