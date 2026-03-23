import { NextResponse } from "next/server";
import { getDB } from "@/lib/get-db";

export async function GET() {
  try {
    const db = await getDB();
    const rows = await db
      .prepare("SELECT id, username, created_at FROM users ORDER BY username ASC")
      .all<{ id: number; username: string; created_at: string }>();

    return NextResponse.json({ users: rows.results });
  } catch (err) {
    console.error("Users error:", err);
    return NextResponse.json({ error: "Interní chyba serveru." }, { status: 500 });
  }
}
