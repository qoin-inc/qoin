import { NextResponse } from "next/server";
import { isSystemAdminRequest } from "@/lib/systemAdminServer";
import { createWebhookSupabaseClient } from "@/lib/stripeConnectServer";
import { validateInvoiceIssuer } from "@/lib/systemUsageIssuer";

export async function GET(req: Request) {
  if (!isSystemAdminRequest(req)) return NextResponse.json({ error: "システム管理者ログインが必要です。" }, { status: 401 });
  const result = await createWebhookSupabaseClient().from("system_usage_bank_account").select("issuer").eq("id", 1).maybeSingle();
  if (result.error) return NextResponse.json({ error: "発行元情報を読み込めませんでした。" }, { status: 500 });
  return NextResponse.json({ issuer: result.data?.issuer || null });
}

export async function POST(req: Request) {
  if (!isSystemAdminRequest(req)) return NextResponse.json({ error: "システム管理者ログインが必要です。" }, { status: 401 });
  let issuer;
  try {
    issuer = validateInvoiceIssuer((await req.json()).issuer);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "発行元情報を確認してください。" }, { status: 400 });
  }
  // Preserve the legacy bank fields and all issued invoice snapshots.
  const saved = await createWebhookSupabaseClient().from("system_usage_bank_account")
    .update({ issuer, updated_at: new Date().toISOString() }).eq("id", 1).select("issuer").maybeSingle();
  if (saved.error) return NextResponse.json({ error: "発行元情報を保存できませんでした。" }, { status: 500 });
  if (!saved.data) return NextResponse.json({ error: "発行元情報の保存先が未作成です。運営にデータベースの初期設定を依頼してください。" }, { status: 409 });
  return NextResponse.json({ issuer: saved.data.issuer });
}
