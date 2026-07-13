import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "el_town_system_session";
const LOGIN_ID = process.env.SYSTEM_LOGIN_ID || "admin";
const LOGIN_PASSWORD = process.env.SYSTEM_LOGIN_PASSWORD || "eltown-admin";
const SESSION_SECRET = process.env.SYSTEM_SESSION_SECRET || `${LOGIN_ID}:${LOGIN_PASSWORD}:el-town-system`;
const sessionToken = () => createHash("sha256").update(SESSION_SECRET).digest("hex");

const sameValue = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

export async function GET(request: NextRequest) {
  return NextResponse.json({ authenticated: sameValue(request.cookies.get(COOKIE_NAME)?.value || "", sessionToken()) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!sameValue(String(body.loginId || ""), LOGIN_ID) || !sameValue(String(body.password || ""), LOGIN_PASSWORD)) {
    return NextResponse.json({ error: "ログインIDまたはパスワードが正しくありません。" }, { status: 401 });
  }
  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(COOKIE_NAME, sessionToken(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
