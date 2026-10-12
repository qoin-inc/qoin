import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  SYSTEM_SESSION_COOKIE_NAME,
  hasSystemLoginConfig,
  isSystemAdminRequest,
  systemLoginCredentialsMatch,
  systemSessionToken,
} from "@/lib/systemAdminServer";
import { isStagingInviteTarget, isStagingSystemAdmin } from "@/lib/stagingInviteTarget";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const createSystemAdminSession = async () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SECRET_KEY) {
    throw new Error("Supabaseのsystem管理者認証設定が不足しています。");
  }
  if (!isStagingInviteTarget(SUPABASE_URL, process.env.STAGING_SUPABASE_PROJECT_REF || "")) {
    throw new Error("検証用Supabaseの接続先が確認できません。");
  }
  const systemAdminId = process.env.STAGING_SYSTEM_ADMIN_AUTH_ID || "";
  if (!isStagingSystemAdmin(systemAdminId, systemAdminId)) {
    throw new Error("検証用システム管理者のAuthユーザーIDが未設定です。");
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: adminData, error: adminError } = await adminClient.auth.admin.getUserById(systemAdminId);
  if (adminError || !adminData.user?.email || !isStagingSystemAdmin(adminData.user.id, systemAdminId)) {
    throw new Error("検証用システム管理者のAuthユーザーを確認できませんでした。");
  }
  const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
    type: "magiclink",
    email: adminData.user.email,
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
  if (sessionError || !sessionData.session || !isStagingSystemAdmin(sessionData.user?.id || "", systemAdminId)) {
    throw sessionError || new Error("検証用システム管理者のAuthユーザーIDが一致しません。");
  }

  return {
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
};

export async function GET(request: NextRequest) {
  const authenticated = isSystemAdminRequest(request);
  if (!authenticated) return NextResponse.json({ authenticated: false });

  try {
    return NextResponse.json({ authenticated: true, ...(await createSystemAdminSession()) });
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error?.message || "system管理者セッションを更新できませんでした。" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!hasSystemLoginConfig()) {
    return NextResponse.json({ error: "system管理者のログイン設定が未完了です。" }, { status: 503 });
  }
  const body = await request.json().catch(() => ({}));
  if (!systemLoginCredentialsMatch(String(body.loginId || ""), String(body.password || ""))) {
    return NextResponse.json({ error: "ログインIDまたはパスワードが正しくありません。" }, { status: 401 });
  }
  let supabaseSession;
  try {
    supabaseSession = await createSystemAdminSession();
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "system管理者セッションを作成できませんでした。" }, { status: 503 });
  }
  const response = NextResponse.json({ authenticated: true, ...supabaseSession });
  response.cookies.set(SYSTEM_SESSION_COOKIE_NAME, systemSessionToken(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 8 });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(SYSTEM_SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 0 });
  return response;
}
