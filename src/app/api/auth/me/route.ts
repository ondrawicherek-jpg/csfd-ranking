import { NextRequest, NextResponse } from "next/server";
import { verifyJWT, getTokenFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request);
  if (!token) return NextResponse.json({ user: null });
  const payload = await verifyJWT(token);
  if (!payload) return NextResponse.json({ user: null });
  return NextResponse.json({ user: { userId: payload.userId, username: payload.username } });
}
