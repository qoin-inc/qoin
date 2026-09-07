import { NextResponse } from "next/server";
import { isSystemAdminRequest } from "@/lib/systemAdminServer";
import { createWebhookSupabaseClient } from "@/lib/stripeConnectServer";
import { validateUsageRate } from "@/lib/systemUsageRates";

export async function POST(req: Request) {
  if (!isSystemAdminRequest(req)) return NextResponse.json({ error: "システム管理者権限が必要です。" }, { status: 401 });
  try {
    const rate = validateUsageRate(await req.json());
    const { error } = await createWebhookSupabaseClient().from("system_usage_rate_versions").insert(rate);
    if (error?.code === "23505") return NextResponse.json({ error: "その適用開始月は登録済みです。履歴を保持するため別の開始月を指定してください。" }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || "料金履歴を保存できませんでした。") }, { status: 400 });
  }
}
