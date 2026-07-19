import { NextResponse } from "next/server";
import { requireNeighborhoodAdmin } from "@/lib/stripeConnectServer";
import {
  getSystemUsagePaymentProfile,
  setSystemUsagePaymentMethod,
  type SystemUsagePaymentMethod,
} from "@/lib/systemUsageBillingServer";

const statusForError = (message: string) => message.includes("ログイン") ? 401 : message.includes("権限") ? 403 : 500;

export async function GET(req: Request) {
  try {
    const townId = new URL(req.url).searchParams.get("townId") || "";
    if (!townId) return NextResponse.json({ error: "townId is required" }, { status: 400 });
    const { writeClient } = await requireNeighborhoodAdmin(req, townId);
    const profile = await getSystemUsagePaymentProfile(writeClient, townId);
    return NextResponse.json({ profile });
  } catch (error: any) {
    const message = String(error?.message || "決済方法を確認できませんでした。");
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const townId = body.townId;
    const paymentMethod = String(body.paymentMethod || "") as SystemUsagePaymentMethod;
    if (!townId) return NextResponse.json({ error: "townId is required" }, { status: 400 });
    if (!(["card", "bank_transfer"] as string[]).includes(paymentMethod)) {
      return NextResponse.json({ error: "決済方法が正しくありません。" }, { status: 400 });
    }
    const { writeClient } = await requireNeighborhoodAdmin(req, townId);
    const profile = await setSystemUsagePaymentMethod(writeClient, townId, paymentMethod);
    return NextResponse.json({ profile });
  } catch (error: any) {
    const message = String(error?.message || "決済方法を保存できませんでした。");
    return NextResponse.json({ error: message }, { status: statusForError(message) });
  }
}
