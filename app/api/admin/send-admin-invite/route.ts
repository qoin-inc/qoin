import { NextResponse } from "next/server";
import { requireNeighborhoodAdmin } from "@/lib/stripeConnectServer";

const INVITE_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

const escapeHtml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatJapaneseDate = (date: Date) => new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Tokyo",
}).format(date);

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const townId = String(body?.townId || "");
    const invitationId = String(body?.invitationId || "");
    const deliveryId = String(body?.deliveryId || "");
    if (!townId || !invitationId) {
      return NextResponse.json({ error: "招待情報を確認できません。" }, { status: 400 });
    }
    if (deliveryId && !/^[0-9a-f-]{36}$/i.test(deliveryId)) {
      return NextResponse.json({ error: "メール送信情報が正しくありません。" }, { status: 400 });
    }

    const { writeClient } = await requireNeighborhoodAdmin(request, townId);
    const { data: invitation, error } = await writeClient
      .from("neighborhood_admins")
      .select("id,neighborhood_id,admin_email,admin_name,admin_role,status,admin_invite_token,invited_at,neighborhoods(name)")
      .eq("id", invitationId)
      .eq("neighborhood_id", townId)
      .maybeSingle();

    if (error || !invitation) {
      return NextResponse.json({ error: "作成した役員招待を確認できません。" }, { status: 404 });
    }
    if (invitation.status !== "pending" || !invitation.admin_invite_token || !invitation.invited_at) {
      return NextResponse.json({ error: "この役員招待はメール送信できる状態ではありません。" }, { status: 409 });
    }

    const invitedAt = new Date(invitation.invited_at);
    const expiresAt = new Date(invitedAt.getTime() + INVITE_VALIDITY_MS);
    if (!Number.isFinite(invitedAt.getTime()) || expiresAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: "この役員招待は有効期限が切れています。再発行してください。" }, { status: 410 });
    }

    const resendApiKey = process.env.RESEND_API_KEY || "";
    const emailFrom = process.env.ADMIN_INVITE_EMAIL_FROM || process.env.RESEND_EMAIL_FROM || "";
    if (!resendApiKey || !emailFrom) {
      return NextResponse.json({
        error: "招待メールの送信設定が未完了です。URLをコピーして候補者へ送ってください。",
        code: "email_not_configured",
      }, { status: 503 });
    }

    const town = Array.isArray(invitation.neighborhoods)
      ? invitation.neighborhoods[0]
      : invitation.neighborhoods;
    const townName = String(town?.name || "町内会・自治会");
    const candidateName = String(invitation.admin_name || "役員候補者");
    const role = String(invitation.admin_role || "役員");
    const recipient = String(invitation.admin_email || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      return NextResponse.json({ error: "招待先メールアドレスが正しくありません。" }, { status: 400 });
    }
    const origin = process.env.NEXT_PUBLIC_BASE_URL || new URL(request.url).origin;
    const inviteUrl = `${origin.replace(/\/$/, "")}/admin?mode=invite&token=${encodeURIComponent(invitation.admin_invite_token)}`;
    const expiresLabel = formatJapaneseDate(expiresAt);
    const subject = `【el-town】${townName.replace(/[\r\n]+/g, " ")}の役員招待`;
    const text = `${candidateName} 様\n\n${townName}から、el-townの${role}として招待されました。\n以下のURLを開き、役員アカウントを登録してください。\n\n${inviteUrl}\n\n有効期限：${expiresLabel}\n有効期限を過ぎた場合は、代表役員へ再発行を依頼してください。\n\n※このメールに心当たりがない場合は、破棄してください。`;
    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Noto Sans JP',sans-serif;color:#243746;line-height:1.8">
        <p>${escapeHtml(candidateName)} 様</p>
        <p><strong>${escapeHtml(townName)}</strong>から、el-townの<strong>${escapeHtml(role)}</strong>として招待されました。</p>
        <p>下のボタンを押し、役員アカウントを登録してください。</p>
        <p style="margin:28px 0"><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;padding:14px 24px;border-radius:10px;background:#118bb3;color:#fff;font-weight:700;text-decoration:none">役員登録を開始する</a></p>
        <p>有効期限：<strong>${escapeHtml(expiresLabel)}</strong></p>
        <p style="color:#607b89;font-size:13px">有効期限を過ぎた場合は、代表役員へ再発行を依頼してください。<br>このメールに心当たりがない場合は、破棄してください。</p>
      </div>
    `;

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `admin-invite-${invitation.id}-${deliveryId || invitedAt.getTime()}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        to: [recipient],
        subject,
        html,
        text,
      }),
    });

    const responseBody = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("[admin-invite-email] send failed", { status: response.status, invitationId });
      return NextResponse.json({ error: "招待メールを送信できませんでした。送信設定を確認するか、URLをコピーして送ってください。" }, { status: 502 });
    }

    return NextResponse.json({ sent: true, emailId: responseBody?.id || null, expiresAt: expiresAt.toISOString() });
  } catch (error: any) {
    console.error("[admin-invite-email] unexpected error", { message: error?.message || "unknown" });
    return NextResponse.json({ error: error?.message || "招待メールの送信に失敗しました。" }, { status: 500 });
  }
}
