import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const lineAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN || "";

const categoryLabel = (category?: string) => {
  if (category === "live") return "Web会議";
  if (category === "event") return "イベント";
  if (category === "assembly") return "総会通知";
  if (category === "notice" || category === "info") return "連絡";
  return "電子回覧板";
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const townId = body.townId;
  const circularId = body.circularId;
  const title = String(body.title || "お知らせ");
  const category = String(body.category || "circular");
  const content = String(body.content || "");
  const pushEnabled = body.pushEnabled !== false;
  const targetUrl = body.targetUrl ? String(body.targetUrl) : "";

  if (!townId) {
    return NextResponse.json({ error: "townId is required" }, { status: 400 });
  }

  if (!pushEnabled) {
    return NextResponse.json({ skipped: true, reason: "LINE push is disabled for this publish item", targets: 0 });
  }

  const { data: rosters, error } = await supabase
    .from("resident_rosters")
    .select("user_auth_id,family_user_auth_id_1,family_user_auth_id_2,withdrawal_status,status")
    .eq("neighborhood_id", townId)
    .limit(10000);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const targets = Array.from(new Set(
    (rosters || [])
      .filter((row: any) => row.withdrawal_status !== "withdrawn" && row.status !== "withdrawn")
      .flatMap((row: any) => [row.user_auth_id, row.family_user_auth_id_1, row.family_user_auth_id_2])
      .filter(Boolean),
  ));

  if (!lineAccessToken) {
    return NextResponse.json({ skipped: true, reason: "LINE channel access token is not configured", targets: targets.length });
  }

  const origin = new URL(request.url).origin;
  const detailUrl = targetUrl || (circularId ? `${origin}/resident?open=${encodeURIComponent(String(circularId))}` : `${origin}/resident`);
  const text = [
    `【${categoryLabel(category)}】${title}`,
    content.slice(0, 280),
    "LINEのリッチメニューからも詳細を確認できます。",
    detailUrl,
  ].filter(Boolean).join("\n");

  const results = await Promise.allSettled(targets.map((to) => fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${lineAccessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      messages: [{ type: "text", text }],
    }),
  })));

  const sent = results.filter((result) => result.status === "fulfilled" && result.value.ok).length;
  const failed = targets.length - sent;

  return NextResponse.json({ sent, failed, targets: targets.length });
}
