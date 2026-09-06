import { NextResponse } from "next/server";
import { isSystemAdminRequest } from "@/lib/systemAdminServer";
import { createWebhookSupabaseClient } from "@/lib/stripeConnectServer";

export async function POST(req: Request) {
  if (!isSystemAdminRequest(req)) return NextResponse.json({ error: "システム管理者権限が必要です。" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.billingId) return NextResponse.json({ error: "請求を指定してください。" }, { status: 400 });
  try {
    const client = createWebhookSupabaseClient();
    const { data: billing, error } = await client.from("system_usage_billings").select("*").eq("id", body.billingId).maybeSingle();
    if (error) throw error;
    if (!billing || billing.payment_method !== "bank_transfer" || billing.stripe_invoice_id || billing.status !== "open") {
      return NextResponse.json({ error: "入金待ちの銀行口座振込の請求を指定してください。" }, { status: 409 });
    }
    const now = new Date().toISOString();
    const result = await client.from("system_usage_billings").update({ status: "paid", paid_amount: billing.total_amount, paid_at: now, updated_at: now })
      .eq("id", billing.id).eq("status", "open").select("id").maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return NextResponse.json({ error: "請求状態が変更されました。再読み込みしてください。" }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || "入金登録に失敗しました。") }, { status: 500 });
  }
}
