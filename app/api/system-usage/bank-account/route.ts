import { NextResponse } from "next/server";
import { isSystemAdminRequest } from "@/lib/systemAdminServer";
import { createWebhookSupabaseClient, requireNeighborhoodAdmin } from "@/lib/stripeConnectServer";

export async function GET(req: Request) {
  try {
    const townId = new URL(req.url).searchParams.get("townId");
    if (!isSystemAdminRequest(req)) {
      if (!townId) return NextResponse.json({ error: "管理者ログインが必要です。" }, { status: 401 });
      await requireNeighborhoodAdmin(req, townId);
    }
    const client = createWebhookSupabaseClient();
    const issuerResult = await client.from("system_usage_bank_account").select("issuer").eq("id", 1).maybeSingle();
    if (issuerResult.error) throw issuerResult.error;
    if (townId) {
      const profile = await client.from("system_usage_payment_profiles").select("bank_account_snapshot").eq("neighborhood_id", townId).maybeSingle();
      if (profile.error) throw profile.error;
      return NextResponse.json({ account: profile.data?.bank_account_snapshot || null, issuer: issuerResult.data?.issuer || null });
    }
    const [profiles, towns] = await Promise.all([
      client.from("system_usage_payment_profiles").select("neighborhood_id,bank_account_snapshot,payment_method").limit(1000),
      client.from("neighborhoods").select("id,name").order("id").limit(1000),
    ]);
    if (profiles.error || towns.error) throw profiles.error || towns.error;
    return NextResponse.json({ issuer: issuerResult.data?.issuer || null, accounts: (towns.data || []).map(town => ({
      townId: town.id, townName: town.name,
      account: profiles.data?.find(p => String(p.neighborhood_id) === String(town.id))?.bank_account_snapshot || null,
    })) });
  } catch {
    return NextResponse.json({ error: "Stripe振込先を読み込めませんでした。連携設定とデータベースの更新状況を確認してください。" }, { status: 500 });
  }
}

export async function POST() {
  return NextResponse.json({ error: "振込先はStripeから連携するため、手入力では登録・変更できません。" }, { status: 405 });
}
