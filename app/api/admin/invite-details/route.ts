import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const INVITE_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

const json = (body: Record<string, unknown>, status = 200) => NextResponse.json(body, {
  status,
  headers: { "Cache-Control": "no-store" },
});

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token")?.trim() || "";
  if (!token) return json({ error: "招待IDが不正です。URLをご確認ください。" }, 400);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !supabaseSecretKey) {
    return json({ error: "招待情報を確認できません。しばらくしてから再度お試しください。" }, 503);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let inviteResult = await supabase
    .from("neighborhood_admins")
    .select("status,invited_at,neighborhoods(name)")
    .eq("admin_invite_token", token)
    .maybeSingle();

  if (inviteResult.error && String(inviteResult.error.message || "").includes("admin_invite_token")) {
    inviteResult = await supabase
      .from("neighborhood_admins")
      .select("status,invited_at,neighborhoods(name)")
      .eq("invite_token", token)
      .maybeSingle();
  }

  const invitation = inviteResult.data;
  if (inviteResult.error || !invitation) {
    return json({ error: "役員招待情報が見つかりません。招待URLをご確認ください。" }, 404);
  }
  if (invitation.status === "retired" || invitation.status === "rejected") {
    return json({ error: "この役員招待は利用できません。代表者に再招待を依頼してください。" }, 410);
  }
  if (invitation.status === "active") {
    return json({ error: "この役員招待はすでに利用済みです。" }, 409);
  }

  const invitedAt = new Date(invitation.invited_at || "").getTime();
  if (!Number.isFinite(invitedAt) || invitedAt + INVITE_VALIDITY_MS <= Date.now()) {
    return json({ error: "この役員招待は発行から7日を過ぎて失効しました。" }, 410);
  }

  const town = Array.isArray(invitation.neighborhoods)
    ? invitation.neighborhoods[0]
    : invitation.neighborhoods;
  const townName = String(town?.name || "").trim();
  if (!townName) {
    return json({ error: "招待先の町内会・自治会を確認できません。" }, 404);
  }

  return json({ townName });
}
