import type Stripe from "stripe";
import type { BankAccount } from "@/lib/systemUsageBankAccount";

export type StripeBankAccount = BankAccount & { source: "stripe"; stripe_customer_id: string; stripe_account_id: string | null };

export function fundingInstructionsAccount(instructions: any, customerId: string, accountId?: string): StripeBankAccount {
  const address = instructions.financial_addresses?.find((item: any) => item.type === "zengin")?.zengin;
  if (!address?.account_number || !address?.bank_name || !address?.branch_name) throw new Error("Stripeから日本の銀行振込先を取得できませんでした。");
  const type = String(address.account_type || "");
  if (!["futsu", "toza", "ordinary", "checking"].includes(type)) throw new Error("Stripeの口座種別を確認できませんでした。");
  return {
    source: "stripe", stripe_customer_id: customerId, stripe_account_id: accountId || null,
    bank_name: address.bank_name, bank_code: address.bank_code || "",
    bank_branch_name: address.branch_name, bank_branch_code: address.branch_code || "",
    bank_account_type: ["toza", "checking"].includes(type) ? "checking" : "ordinary",
    bank_account_number: address.account_number,
    bank_account_holder: address.account_holder_name || "",
  };
}

export async function getStripeBankAccount(stripe: Stripe, customerId: string, accountId?: string) {
  const instructions = await stripe.customers.createFundingInstructions(customerId, {
    funding_type: "bank_transfer", currency: "jpy", bank_transfer: { type: "jp_bank_transfer" },
  }, accountId ? { stripeAccount: accountId } : undefined);
  return fundingInstructionsAccount(instructions, customerId, accountId);
}

export const stripeBankPaymentOptions = {
  customer_balance: { funding_type: "bank_transfer" as const, bank_transfer: { type: "jp_bank_transfer" as const } },
};
