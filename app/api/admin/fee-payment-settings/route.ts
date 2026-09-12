import { NextResponse } from "next/server";
import { requireNeighborhoodAdmin } from "@/lib/stripeConnectServer";
import { createPayPayStripeClient } from "@/lib/paypayServer";

export async function POST(req: Request) {
  try {
    const { townId, cashEnabled, cardEnabled, bankEnabled } = await req.json();
    if (!townId || [cashEnabled, cardEnabled, bankEnabled].some(value => typeof value !== "boolean")) return NextResponse.json({ error: "支払方法を指定してください。" }, { status: 400 });
    const { writeClient } = await requireNeighborhoodAdmin(req, townId);
    const current = await writeClient.from("neighborhood_fee_settings").select("*").eq("neighborhood_id", townId).maybeSingle();
    if (current.error) throw current.error;
    let bankStatus: string | null = null;
    if (bankEnabled) {
      const town = await writeClient.from("neighborhoods").select("stripe_account_id").eq("id", townId).single();
      if (town.error) throw town.error;
      if (!town.data?.stripe_account_id) return NextResponse.json({ error: "先に町内会・自治会のStripe連携を完了してください。" }, { status: 400 });
      const stripe = createPayPayStripeClient();
      const account = await stripe.accounts.update(town.data.stripe_account_id, { capabilities: { jp_bank_transfer_payments: { requested: true } } } as any);
      bankStatus = (account.capabilities as any)?.jp_bank_transfer_payments || "pending";
    }
    if (!cashEnabled && !cardEnabled && !bankEnabled && !current.data?.stripe_paypay_enabled) return NextResponse.json({ error: "支払方法を1つ以上選択してください。" }, { status: 400 });
    const saved = await writeClient.from("neighborhood_fee_settings").upsert({
      ...(current.data || {}), neighborhood_id: townId,
      cash_enabled: cashEnabled, stripe_card_enabled: cardEnabled,
      stripe_bank_transfer_enabled: bankEnabled, bank_transfer_enabled: false,
    }, { onConflict: "neighborhood_id" }).select("*").single();
    if (saved.error) throw saved.error;
    return NextResponse.json({ setting: saved.data, message: bankEnabled && bankStatus !== "active" ? "設定を保存しました。Stripe銀行振込は審査完了後に利用できます。Stripe連携画面で必要な登録情報を確認してください。" : "会員が選べる支払方法を保存しました。" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "支払方法を保存できませんでした。" }, { status: 400 });
  }
}
