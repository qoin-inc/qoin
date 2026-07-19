import { NextResponse } from "next/server";
import { requireNeighborhoodAdmin } from "@/lib/stripeConnectServer";
import { createSystemUsageCardSetupSession, setSystemUsagePaymentMethod } from "@/lib/systemUsageBillingServer";
import { isSystemBillingEnabled } from "@/lib/systemAdminServer";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const townId = body.townId;
    if (!townId) return NextResponse.json({ error: "townId is required" }, { status: 400 });
    const { writeClient } = await requireNeighborhoodAdmin(req, townId);
    if (!isSystemBillingEnabled()) {
      return NextResponse.json({ error: "システム利用料のカード登録は本番運用開始まで停止中です。" }, { status: 503 });
    }
    await setSystemUsagePaymentMethod(writeClient, townId, "card");
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || new URL(req.url).origin;
    const session = await createSystemUsageCardSetupSession(writeClient, townId, baseUrl);
    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    const message = String(error?.message || "カード登録画面を作成できませんでした。");
    const status = message.includes("ログイン") ? 401 : message.includes("権限") ? 403 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
