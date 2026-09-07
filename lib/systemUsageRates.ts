export const validUsageMonth = (value: string) => /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
export const usageMonthLabel = (value: string) => validUsageMonth(value) ? `${value.slice(0, 4)}年${Number(value.slice(5))}月` : "年月未選択";
export const shiftUsageMonth = (value: string, offset: number) => {
  if (!validUsageMonth(value)) return "";
  const date = new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5)) - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};
export const rateForMonth = (rates: any[], month: string) => rates.filter(rate => rate.effective_month <= month).sort((a, b) => b.effective_month.localeCompare(a.effective_month))[0] || null;
export const billingIsIssued = (billing: any) => Boolean(billing && (billing.stripe_invoice_id || billing.invoice_issued_at || billing.status === "paid" || billing.status === "open"));
export function validateUsageRate(input: any) {
  if (!validUsageMonth(String(input.effective_month || ""))) throw new Error("適用開始月を選択してください。");
  const result: any = { effective_month: input.effective_month, change_reason: String(input.change_reason || "").trim() };
  if (!result.change_reason || result.change_reason.length > 500) throw new Error("登録理由を500文字以内で入力してください。");
  for (const key of ["monthly_household_price", "free_push_limit", "push_unit_price", "tax_rate"]) {
    const raw = input[key];
    const value = Number(raw);
    if (raw === null || raw === undefined || String(raw).trim() === "" || !Number.isFinite(value) || value < 0 || value > (key === "tax_rate" ? 100 : 100000000) || (key !== "tax_rate" && !Number.isInteger(value)) || (key === "tax_rate" && Math.abs(value * 100 - Math.round(value * 100)) > 0.00001)) throw new Error("単価・無料枠は0以上の整数、税率は0〜100の小数第2位までで入力してください。");
    result[key] = value;
  }
  return result;
}

export function usageAmounts(rate: any, linked: number, pushes: number) {
  const overage = Math.max(pushes - Number(rate.free_push_limit), 0);
  const subtotal = linked * Number(rate.monthly_household_price) + overage * Number(rate.push_unit_price);
  const tax = Math.round(subtotal * Number(rate.tax_rate) / 100);
  return { overage, subtotal, tax, total: subtotal + tax };
}
