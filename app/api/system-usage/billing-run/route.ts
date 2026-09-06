import { NextResponse } from "next/server";
import { isSystemAdminRequest, isSystemBillingCronRequest, isSystemBillingEnabled } from "@/lib/systemAdminServer";
import {
  defaultSystemUsageBillingMonth,
  issueSystemUsageInvoices,
  snapshotSystemUsage,
} from "@/lib/systemUsageBillingServer";

export const maxDuration = 30;

export async function GET(req: Request) {
  if (!isSystemAdminRequest(req)) {
    return NextResponse.json({ error: "システム管理者権限を確認できませんでした。" }, { status: 401 });
  }
  return NextResponse.json({ enabled: isSystemBillingEnabled(), manualEnabled: true });
}

export async function POST(req: Request) {
  const manualRequest = isSystemAdminRequest(req);
  if (!manualRequest && !isSystemBillingCronRequest(req)) {
    return NextResponse.json({ error: "システム管理者権限を確認できません。" }, { status: 401 });
  }
  if (!manualRequest && !isSystemBillingEnabled()) {
    return NextResponse.json({ error: "システム利用料の請求処理は本番運用開始まで停止中です。" }, { status: 503 });
  }
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode === "snapshot" ? "snapshot" : body.mode === "invoice" ? "invoice" : "";
    if (!mode) return NextResponse.json({ error: "mode must be snapshot or invoice" }, { status: 400 });
    const billingMonth = String(body.billingMonth || defaultSystemUsageBillingMonth(mode));
    const result = mode === "snapshot"
      ? await snapshotSystemUsage(billingMonth)
      : await issueSystemUsageInvoices(billingMonth, { bankTransferOnly: !isSystemBillingEnabled() });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("System usage billing run failed", error);
    return NextResponse.json({ error: String(error?.message || "月次請求処理に失敗しました。") }, { status: 500 });
  }
}
