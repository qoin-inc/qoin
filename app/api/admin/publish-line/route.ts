import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const lineAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN || "";

const baseRosterSelect = "user_auth_id,family_user_auth_id_1,family_user_auth_id_2,withdrawal_status";
const lineRosterSelect = `${baseRosterSelect},line_user_id,family_line_user_id_1,family_line_user_id_2`;

const categoryLabel = (category?: string) => {
  if (category === "live") return "Web会議";
  if (category === "event") return "イベント";
  if (category === "assembly") return "総会通知";
  if (category === "notice" || category === "info") return "連絡";
  return "電子回覧板";
};

const isLineUserId = (value?: string | null) => /^U[0-9a-f]{32}$/i.test(String(value || ""));

const normalizeLineUserId = (value?: string | null) => {
  const raw = String(value || "").trim();
  if (!isLineUserId(raw)) return "";
  return `U${raw.slice(1)}`;
};

const maskLineUserId = (value: string) => `${value.slice(0, 5)}...${value.slice(-4)}`;

const lineSafeImageUrl = (value?: string | null) => {
  const url = String(value || "").trim();
  if (!url) return "";

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return "";
    if (!/\.(png|jpe?g)$/i.test(parsed.pathname)) return "";
    return url;
  } catch {
    return "";
  }
};

const buildLineMessages = (params: {
  category: string;
  title: string;
  content: string;
  detailUrl: string;
  imageUrl: string;
}) => {
  const label = categoryLabel(params.category);
  const bodyContents = [
    {
      type: "text",
      text: label,
      size: "sm",
      color: "#2e8bc0",
      weight: "bold",
    },
    {
      type: "text",
      text: params.title.slice(0, 80),
      size: "lg",
      color: "#111827",
      weight: "bold",
      wrap: true,
    },
    params.content
      ? {
          type: "text",
          text: params.content.slice(0, 280),
          size: "sm",
          color: "#4b5563",
          wrap: true,
        }
      : null,
  ].filter(Boolean);
  const bubble: Record<string, any> = {
    type: "bubble",
    body: {
      type: "box",
      layout: "vertical",
      spacing: "md",
      contents: bodyContents,
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#58aede",
          action: {
            type: "uri",
            label: "詳細はこちら",
            uri: params.detailUrl,
          },
        },
      ],
    },
  };

  if (params.imageUrl) {
    bubble.hero = {
      type: "image",
      url: params.imageUrl,
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover",
    };
  }

  return [
    {
      type: "flex",
      altText: `【${label}】${params.title}`.slice(0, 400),
      contents: bubble,
    },
  ];
};

const logLinePush = (event: string, detail: Record<string, unknown>) => {
  console.info("[line-push]", event, detail);
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
  const imageUrl = lineSafeImageUrl(body.imageUrl || body.image_url);

  if (!townId) {
    logLinePush("invalid-request", { reason: "townId is required" });
    return NextResponse.json({ error: "townId is required" }, { status: 400 });
  }

  if (!pushEnabled) {
    logLinePush("skipped", { townId, category, reason: "LINE push is disabled for this publish item" });
    return NextResponse.json({ skipped: true, reason: "LINE push is disabled for this publish item", targets: 0 });
  }

  let missingLineColumns = false;
  let rosters: any[] | null = null;
  let { data: rosterRows, error } = await supabase
    .from("resident_rosters")
    .select(lineRosterSelect)
    .eq("neighborhood_id", townId)
    .limit(10000);
  rosters = rosterRows as any[] | null;

  if (error && /line_user_id|family_line_user_id/i.test(String(error.message || ""))) {
    missingLineColumns = true;
    const fallback = await supabase
      .from("resident_rosters")
      .select(baseRosterSelect)
      .eq("neighborhood_id", townId)
      .limit(10000);
    rosters = fallback.data as any[] | null;
    error = fallback.error;
  }

  if (error) {
    logLinePush("roster-query-error", { townId, category, message: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const activeRosters = (rosters || []).filter((row: any) => row.withdrawal_status !== "withdrawn");
  const linkedAccounts = Array.from(new Set(
    activeRosters.flatMap((row: any) => [row.user_auth_id, row.family_user_auth_id_1, row.family_user_auth_id_2]).filter(Boolean),
  )).length;
  const targets = Array.from(new Set(
    activeRosters.flatMap((row: any) => [
      row.line_user_id,
      row.family_line_user_id_1,
      row.family_line_user_id_2,
      row.user_auth_id,
      row.family_user_auth_id_1,
      row.family_user_auth_id_2,
    ]).map(normalizeLineUserId).filter(Boolean),
  ));

  if (!lineAccessToken) {
    logLinePush("skipped", {
      townId,
      category,
      reason: "LINE channel access token is not configured",
      targets: targets.length,
      linkedAccounts,
    });
    return NextResponse.json({ skipped: true, reason: "LINE channel access token is not configured", targets: targets.length, linkedAccounts });
  }

  if (targets.length === 0) {
    logLinePush("skipped", {
      townId,
      category,
      reason: missingLineColumns ? "LINE user ID columns are not configured" : "No LINE user IDs are registered",
      activeRosters: activeRosters.length,
      linkedAccounts,
      missingLineColumns,
    });
    return NextResponse.json({
      skipped: true,
      reason: missingLineColumns ? "LINE user ID columns are not configured" : "No LINE user IDs are registered",
      targets: 0,
      linkedAccounts,
      missingLineColumns,
    });
  }

  const origin = new URL(request.url).origin;
  const detailUrl = targetUrl || (circularId ? `${origin}/resident?open=${encodeURIComponent(String(circularId))}` : `${origin}/resident`);
  const messages = buildLineMessages({ category, title, content, detailUrl, imageUrl });

  const results = await Promise.allSettled(targets.map(async (to) => {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${lineAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        messages,
      }),
    });
    const detail = response.ok ? "" : await response.text().catch(() => "");
    return { ok: response.ok, status: response.status, to: maskLineUserId(to), detail: detail.slice(0, 300) };
  }));

  const sent = results.filter((result) => result.status === "fulfilled" && result.value.ok).length;
  const failed = targets.length - sent;
  const errors = results
    .filter((result): result is PromiseFulfilledResult<{ ok: boolean; status: number; to: string; detail: string }> => result.status === "fulfilled" && !result.value.ok)
    .map((result) => result.value)
    .slice(0, 5);
  const rejected = results.filter((result) => result.status === "rejected").length;

  logLinePush(failed === 0 && rejected === 0 ? "completed" : "completed-with-errors", {
    townId,
    category,
    targets: targets.length,
    linkedAccounts,
    sent,
    failed,
    rejected,
    errors,
  });

  return NextResponse.json({ sent, failed, targets: targets.length, linkedAccounts, errors });
}
