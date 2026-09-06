import { NextResponse } from "next/server";
import { isSystemAdminRequest } from "@/lib/systemAdminServer";
import { createWebhookSupabaseClient, requireNeighborhoodAdmin } from "@/lib/stripeConnectServer";
import { validateBankAccount } from "@/lib/systemUsageBankAccount";

export async function GET(req: Request) {
  try {
    if (!isSystemAdminRequest(req)) {
      const townId = new URL(req.url).searchParams.get("townId");
      if (!townId) return NextResponse.json({ error: "管理者ログインが必要です。" }, { status: 401 });
      await requireNeighborhoodAdmin(req, townId);
    }
    const { data, error } = await createWebhookSupabaseClient().from("system_usage_bank_account").select("bank_name,bank_branch_name,bank_account_type,bank_account_number,bank_account_holder").eq("id", 1).maybeSingle();
    if (error) throw error;
    return NextResponse.json({ account: data });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || "振込先口座を確認できませんでした。") }, { status: 400 });
  }
}

export async function POST(req: Request) {
  if (!isSystemAdminRequest(req)) return NextResponse.json({ error: "システム管理者権限が必要です。" }, { status: 401 });
  try {
    const account = validateBankAccount(await req.json());
    const { error } = await createWebhookSupabaseClient().from("system_usage_bank_account").upsert({ id: 1, ...account, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) throw error;
    return NextResponse.json({ account });
  } catch (error: any) {
    return NextResponse.json({ error: String(error?.message || "振込先口座を保存できませんでした。") }, { status: 400 });
  }
}
