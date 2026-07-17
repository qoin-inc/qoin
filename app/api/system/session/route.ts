import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const COOKIE_NAME = "el_town_system_session";
const LOGIN_ID = process.env.SYSTEM_LOGIN_ID || "admin";
const LOGIN_PASSWORD = process.env.SYSTEM_LOGIN_PASSWORD || "eltown-admin";
const SESSION_SECRET = process.env.SYSTEM_SESSION_SECRET || `${LOGIN_ID}:${LOGIN_PASSWORD}:el-town-system`;
const SYSTEM_ADMIN_EMAIL = process.env.SYSTEM_ADMIN_EMAIL || "admin@el-town.jp";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const sessionToken = () => createHash("sha256").update(SESSION_SECRET).digest("hex");

const sameValue = (left: string, right: string) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
};

const createSystemAdminSession = async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SECRET_KEY) {
    throw new Error("Supabaseのsystem管理者認証設定が不足しています。");
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: SYSTEM_ADMIN_EMAIL,
  });
  if (linkError) throw linkError;

  const tokenHash = linkData?.properties?.hashed_token;
  if (!tokenHash) throw new Error("system管理者の認証トークンを発行できませんでした。");

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: sessionData, error: sessionError } = await authClient.auth.verifyOtp({
    type: "magiclink",
    token_hash: tokenHash,
  });
  if (sessionError || !sessionData.session) throw sessionError || new Error("system管理者セッションを作成できませんでした。");

  return {
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
};

export async function GET(request: NextRequest) {
  const authenticated = sameValue(request.cookies.get(COOKIE_NAME)?.value || "", sessionToken());
  if (!authenticated) return NextResponse.json({ authenticated: false });

  try {
    return NextResponse.json({ authenticated: true, ...(await createSystemAdminSession()) });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error?.message || "system管理者セッションを更新できませんでした。" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (!sameValue(String(body.loginId || ""), LOGIN_ID) || !sameValue(String(body.password || ""), LOGIN_PASSWORD)) {
    return NextResponse.json({ error: "ログインIDまたはパスワードが正しくありません。" }, { status: 401 });
  }
  let supabaseSession;
  try {
    supabaseSession = await createSystemAdminSession();
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "system管理者セッションを作成できませんでした。" }, { status: 503 });
  }
  const response = NextResponse.json({ authenticated: true, ...supabaseSession });
  response.cookies.set(COOKIE_NAME, sessionToken(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(COOKIE_NAME, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
