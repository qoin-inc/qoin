import { SupabaseClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { createStripeClient, createWebhookSupabaseClient } from "@/lib/stripeConnectServer";

export type SystemUsagePaymentMethod = "card" | "bank_transfer";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

const jstDate = (date = new Date()) => new Date(date.getTime() + JST_OFFSET_MS);

export const defaultSystemUsageBillingMonth = (mode: "snapshot" | "invoice", date = new Date()) => {
  const value = jstDate(date);
  const year = value.getUTCFullYear();
  const monthIndex = value.getUTCMonth() + (mode === "invoice" ? -1 : 0);
  const normalized = new Date(Date.UTC(year, monthIndex, 1));
  return `${normalized.getUTCFullYear()}-${String(normalized.getUTCMonth() + 1).padStart(2, "0")}`;
};

const parseBillingMonth = (billingMonth: string) => {
  const match = /^(\d{4})-(\d{2})$/.exec(billingMonth);
  if (!match) throw new Error("請求対象月はYYYY-MM形式で指定してください。");
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) throw new Error("請求対象月が正しくありません。");
  return { year, month };
};

const monthRange = (billingMonth: string) => {
  const { year, month } = parseBillingMonth(billingMonth);
  const start = new Date(Date.UTC(year, month - 1, 1) - JST_OFFSET_MS);
  const end = new Date(Date.UTC(year, month, 1) - JST_OFFSET_MS);
  return { start: start.toISOString(), end: end.toISOString() };
};

const invoiceDates = (billingMonth: string, now = new Date()) => {
  const { year, month } = parseBillingMonth(billingMonth);
  const nominalIssueAt = new Date(Date.UTC(year, month, 1) - JST_OFFSET_MS);
  const dueAt = new Date(Date.UTC(year, month + 1, 1) - JST_OFFSET_MS - 1000);
  const currentJstDay = jstDate(now);
  const currentDayStartUtc = Date.UTC(currentJstDay.getUTCFullYear(), currentJstDay.getUTCMonth(), currentJstDay.getUTCDate());
  const dueJst = jstDate(dueAt);
  const dueDayStartUtc = Date.UTC(dueJst.getUTCFullYear(), dueJst.getUTCMonth(), dueJst.getUTCDate());
  const daysUntilDue = Math.max(1, Math.ceil((dueDayStartUtc - currentDayStartUtc) / 86400000));
  return { nominalIssueAt: nominalIssueAt.toISOString(), dueAt: dueAt.toISOString(), daysUntilDue };
};

const linkedCount = (row: any) => row.withdrawal_status === "withdrawn" ? 0 : [
  row.user_auth_id,
  row.family_withdrawal_status_1 === "withdrawn" ? null : row.family_user_auth_id_1,
  row.family_withdrawal_status_2 === "withdrawn" ? null : row.family_user_auth_id_2,
].filter(Boolean).length;

const throwIfError = (error: any) => {
  if (!error) return;
  const message = String(error.message || error);
  if (message.includes("system_usage_payment_profiles")) {
    throw new Error("システム利用料の決済設定DBが未作成です。追加SQLを適用してください。");
  }
  throw error;
};

export const getSystemUsagePaymentProfile = async (client: SupabaseClient, townId: string | number) => {
  const result = await client
    .from("system_usage_payment_profiles")
    .select("*")
    .eq("neighborhood_id", townId)
    .maybeSingle();
  throwIfError(result.error);
  return result.data;
};

const getTownBillingIdentity = async (client: SupabaseClient, townId: string | number) => {
  const [townResult, adminResult] = await Promise.all([
    client.from("neighborhoods").select("id,name,admin_name,admin_email").eq("id", townId).maybeSingle(),
    client.from("neighborhood_admins").select("admin_name,admin_email").eq("neighborhood_id", townId).eq("status", "active").order("id", { ascending: true }).limit(1).maybeSingle(),
  ]);
  throwIfError(townResult.error);
  if (!townResult.data) throw new Error("町内会・自治会を確認できませんでした。");
  return {
    town: townResult.data,
    name: String(townResult.data.name || "町内会・自治会"),
    contactName: String(townResult.data.admin_name || adminResult.data?.admin_name || ""),
    email: String(townResult.data.admin_email || adminResult.data?.admin_email || ""),
  };
};

export const ensureSystemUsageStripeCustomer = async (
  client: SupabaseClient,
  townId: string | number,
  existingProfile?: any,
) => {
  const profile = existingProfile || await getSystemUsagePaymentProfile(client, townId);
  const { stripe } = createStripeClient();
  const identity = await getTownBillingIdentity(client, townId);

  if (profile?.stripe_customer_id) {
    try {
      const customer = await stripe.customers.update(profile.stripe_customer_id, {
        name: identity.name,
        ...(identity.email ? { email: identity.email } : {}),
        preferred_locales: ["ja"],
        metadata: { el_town_neighborhood_id: String(townId), payment_purpose: "system_usage" },
      });
      return { customer, profile, identity };
    } catch (error: any) {
      if (error?.code !== "resource_missing") throw error;
    }
  }

  const customer = await stripe.customers.create({
    name: identity.name,
    ...(identity.email ? { email: identity.email } : {}),
    preferred_locales: ["ja"],
    metadata: { el_town_neighborhood_id: String(townId), payment_purpose: "system_usage" },
  }, { idempotencyKey: `el-town-system-usage-customer-${townId}` });

  const saved = await client
    .from("system_usage_payment_profiles")
    .upsert({
      neighborhood_id: townId,
      stripe_customer_id: customer.id,
      billing_email: identity.email || null,
      billing_contact_name: identity.contactName || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "neighborhood_id" })
    .select("*")
    .single();
  throwIfError(saved.error);
  return { customer, profile: saved.data, identity };
};

export const setSystemUsagePaymentMethod = async (
  client: SupabaseClient,
  townId: string | number,
  paymentMethod: SystemUsagePaymentMethod,
) => {
  const ensured = await ensureSystemUsageStripeCustomer(client, townId);
  const now = new Date().toISOString();
  const result = await client
    .from("system_usage_payment_profiles")
    .upsert({
      neighborhood_id: townId,
      stripe_customer_id: ensured.customer.id,
      payment_method: paymentMethod,
      bank_transfer_status: paymentMethod === "bank_transfer" ? "ready" : ensured.profile?.bank_transfer_status || null,
      automatic_collection_consent_at: paymentMethod === "card" ? now : null,
      updated_at: now,
    }, { onConflict: "neighborhood_id" })
    .select("*")
    .single();
  throwIfError(result.error);
  return result.data;
};

export const createSystemUsageCardSetupSession = async (
  client: SupabaseClient,
  townId: string | number,
  baseUrl: string,
) => {
  const ensured = await ensureSystemUsageStripeCustomer(client, townId);
  const { stripe } = createStripeClient();
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: ensured.customer.id,
    payment_method_types: ["card"],
    metadata: {
      payment_source: "system_usage_card_setup",
      neighborhood_id: String(townId),
    },
    setup_intent_data: {
      metadata: {
        payment_source: "system_usage_card_setup",
        neighborhood_id: String(townId),
      },
    },
    success_url: `${baseUrl}/admin?payment=system_usage_card_ready`,
    cancel_url: `${baseUrl}/admin?payment=system_usage_card_cancel`,
    locale: "ja",
  });
  return session;
};

export const snapshotSystemUsage = async (billingMonth: string) => {
  parseBillingMonth(billingMonth);
  const client = createWebhookSupabaseClient();
  const [townsResult, membersResult, settingsResult] = await Promise.all([
    client.from("neighborhoods").select("id,name").order("id", { ascending: true }).limit(1000),
    client.from("resident_rosters").select("neighborhood_id,withdrawal_status,user_auth_id,family_user_auth_id_1,family_user_auth_id_2,family_withdrawal_status_1,family_withdrawal_status_2").limit(20000),
    client.from("system_settings").select("*").limit(1000),
  ]);
  throwIfError(townsResult.error || membersResult.error || settingsResult.error);

  const now = new Date().toISOString();
  const results: Array<Record<string, any>> = [];
  for (const town of townsResult.data || []) {
    const existingResult = await client.from("system_usage_billings").select("id,status,stripe_invoice_id").eq("neighborhood_id", town.id).eq("billing_month", billingMonth).maybeSingle();
    throwIfError(existingResult.error);
    if (existingResult.data?.stripe_invoice_id || existingResult.data?.status === "paid") {
      results.push({ townId: town.id, status: "skipped", reason: "already_invoiced" });
      continue;
    }
    const setting = (settingsResult.data || []).find((row: any) => String(row.neighborhood_id) === String(town.id)) || {};
    const count = (membersResult.data || [])
      .filter((row: any) => String(row.neighborhood_id) === String(town.id))
      .reduce((sum: number, row: any) => sum + linkedCount(row), 0);
    const payload = {
      neighborhood_id: town.id,
      billing_month: billingMonth,
      linked_account_count: count,
      monthly_household_price: Number(setting.monthly_household_price || 0),
      free_push_limit: Number(setting.free_push_limit || 0),
      push_unit_price: Number(setting.push_unit_price || 0),
      tax_rate: Number(setting.tax_rate ?? setting.consumption_tax_rate ?? 10),
      snapshot_at: now,
      snapshot_source: "monthly_16th",
      status: "draft",
      updated_at: now,
    };
    const saved = await client.from("system_usage_billings").upsert(payload, { onConflict: "neighborhood_id,billing_month" }).select("id").single();
    throwIfError(saved.error);
    if (!saved.data) throw new Error(`${town.name}の16日実績を保存できませんでした。`);
    results.push({ townId: town.id, billingId: saved.data.id, linkedAccountCount: count, status: "snapshotted" });
  }
  return { mode: "snapshot", billingMonth, processed: results.length, results };
};

const findOrCreateTaxRate = async (stripe: Stripe, percentage: number, cache: Map<string, string>) => {
  if (percentage <= 0) return null;
  const key = String(percentage);
  if (cache.has(key)) return cache.get(key)!;
  const listed = await stripe.taxRates.list({ active: true, limit: 100 });
  const existing = listed.data.find((rate) => rate.metadata?.el_town_system_usage === "true" && Number(rate.percentage) === percentage);
  if (existing) {
    cache.set(key, existing.id);
    return existing.id;
  }
  const created = await stripe.taxRates.create({
    display_name: "消費税",
    description: `el-town システム利用料 消費税 ${percentage}%`,
    jurisdiction: "JP",
    percentage,
    inclusive: false,
    metadata: { el_town_system_usage: "true", rate: key },
  });
  cache.set(key, created.id);
  return created.id;
};

const updateBilling = async (client: SupabaseClient, billingId: string | number, payload: Record<string, any>) => {
  const result = await client.from("system_usage_billings").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", billingId);
  throwIfError(result.error);
};

const ensureSnapshotForInvoice = async (client: SupabaseClient, billingMonth: string) => {
  const existing = await client.from("system_usage_billings").select("id").eq("billing_month", billingMonth).limit(1);
  throwIfError(existing.error);
  if (existing.data?.length) return;
  await snapshotSystemUsage(billingMonth);
  await client.from("system_usage_billings").update({ snapshot_source: "invoice_fallback" }).eq("billing_month", billingMonth);
};

export const issueSystemUsageInvoices = async (billingMonth: string) => {
  parseBillingMonth(billingMonth);
  const client = createWebhookSupabaseClient();
  await ensureSnapshotForInvoice(client, billingMonth);
  const range = monthRange(billingMonth);
  const [billingsResult, pushesResult, profilesResult, townsResult] = await Promise.all([
    client.from("system_usage_billings").select("*").eq("billing_month", billingMonth).order("neighborhood_id", { ascending: true }).limit(1000),
    client.from("circulars").select("id,neighborhood_id").eq("is_pushed", true).gte("created_at", range.start).lt("created_at", range.end).limit(20000),
    client.from("system_usage_payment_profiles").select("*").limit(1000),
    client.from("neighborhoods").select("id,name").limit(1000),
  ]);
  throwIfError(billingsResult.error || pushesResult.error || profilesResult.error || townsResult.error);

  const { stripe } = createStripeClient();
  const dates = invoiceDates(billingMonth);
  const taxRateCache = new Map<string, string>();
  const results: Array<Record<string, any>> = [];

  for (const billing of billingsResult.data || []) {
    if (billing.stripe_invoice_id || billing.status === "paid") {
      results.push({ townId: billing.neighborhood_id, billingId: billing.id, status: "skipped", reason: "already_invoiced" });
      continue;
    }
    const profile = (profilesResult.data || []).find((row: any) => String(row.neighborhood_id) === String(billing.neighborhood_id));
    const town = (townsResult.data || []).find((row: any) => String(row.id) === String(billing.neighborhood_id));
    const pushCount = (pushesResult.data || []).filter((row: any) => String(row.neighborhood_id) === String(billing.neighborhood_id)).length;
    const pushOverage = Math.max(pushCount - Number(billing.free_push_limit || 0), 0);
    const subtotal = Number(billing.linked_account_count || 0) * Number(billing.monthly_household_price || 0)
      + pushOverage * Number(billing.push_unit_price || 0);
    const taxAmount = Math.round(subtotal * Number(billing.tax_rate || 0) / 100);
    const total = subtotal + taxAmount;
    await updateBilling(client, billing.id, {
      push_count: pushCount,
      push_overage_count: pushOverage,
      subtotal_amount: subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      due_date: dates.dueAt,
    });

    if (total <= 0) {
      await updateBilling(client, billing.id, {
        status: "paid",
        paid_amount: 0,
        paid_at: new Date().toISOString(),
        invoice_issued_at: new Date().toISOString(),
        invoice_number: `SYS-${billingMonth.replace("-", "")}-${billing.neighborhood_id}`,
      });
      results.push({ townId: billing.neighborhood_id, billingId: billing.id, status: "paid_zero" });
      continue;
    }

    if (!profile?.payment_method || !profile?.stripe_customer_id) {
      await updateBilling(client, billing.id, { status: "payment_method_required" });
      results.push({ townId: billing.neighborhood_id, billingId: billing.id, status: "payment_method_required" });
      continue;
    }
    if (profile.payment_method === "card" && !profile.stripe_default_payment_method_id) {
      await updateBilling(client, billing.id, { status: "card_setup_required" });
      results.push({ townId: billing.neighborhood_id, billingId: billing.id, status: "card_setup_required" });
      continue;
    }

    try {
      const isBankTransfer = profile.payment_method === "bank_transfer";
      const invoice = await stripe.invoices.create({
        customer: profile.stripe_customer_id,
        collection_method: isBankTransfer ? "send_invoice" : "charge_automatically",
        ...(isBankTransfer ? { days_until_due: dates.daysUntilDue } : {}),
        auto_advance: true,
        description: `el-town システム利用料 ${billingMonth}利用分`,
        footer: "システム利用料のお支払いありがとうございます。",
        custom_fields: [{ name: "請求対象月", value: `${billingMonth}利用分` }],
        metadata: {
          payment_source: "system_usage_billings",
          system_usage_billing_id: String(billing.id),
          neighborhood_id: String(billing.neighborhood_id),
          billing_month: billingMonth,
        },
        payment_settings: isBankTransfer ? {
          payment_method_types: ["customer_balance"],
          payment_method_options: {
            customer_balance: {
              funding_type: "bank_transfer",
              bank_transfer: { type: "jp_bank_transfer" },
            },
          },
        } : { payment_method_types: ["card"] },
      } as Stripe.InvoiceCreateParams, { idempotencyKey: `el-town-system-usage-invoice-${billing.id}` });

      const taxRateId = await findOrCreateTaxRate(stripe, Number(billing.tax_rate || 0), taxRateCache);
      const common = {
        customer: profile.stripe_customer_id,
        invoice: invoice.id,
        currency: "jpy",
        ...(taxRateId ? { tax_rates: [taxRateId] } : {}),
      };
      if (Number(billing.linked_account_count || 0) > 0 && Number(billing.monthly_household_price || 0) > 0) {
        await stripe.invoiceItems.create({
          ...common,
          description: `接続数利用料（${billingMonth}利用分）`,
          quantity: Number(billing.linked_account_count),
          unit_amount: Number(billing.monthly_household_price),
          metadata: { item_type: "linked_accounts", billing_month: billingMonth },
        }, { idempotencyKey: `el-town-system-usage-linked-${billing.id}` });
      }
      if (pushOverage > 0 && Number(billing.push_unit_price || 0) > 0) {
        await stripe.invoiceItems.create({
          ...common,
          description: `プッシュ通知超過料（${billingMonth}利用分）`,
          quantity: pushOverage,
          unit_amount: Number(billing.push_unit_price),
          metadata: { item_type: "push_overage", billing_month: billingMonth },
        }, { idempotencyKey: `el-town-system-usage-push-${billing.id}` });
      }

      let finalized = await stripe.invoices.finalizeInvoice(invoice.id, { auto_advance: true });
      if (isBankTransfer) finalized = await stripe.invoices.sendInvoice(invoice.id);
      await updateBilling(client, billing.id, {
        status: finalized.status === "paid" ? "paid" : "open",
        invoice_number: finalized.number,
        invoice_issued_at: new Date().toISOString(),
        payment_method: profile.payment_method,
        stripe_customer_id: profile.stripe_customer_id,
        stripe_invoice_id: finalized.id,
        stripe_payment_intent_id: typeof finalized.payment_intent === "string" ? finalized.payment_intent : finalized.payment_intent?.id || null,
        stripe_hosted_invoice_url: finalized.hosted_invoice_url,
        stripe_invoice_pdf_url: finalized.invoice_pdf,
        paid_amount: finalized.amount_paid || 0,
        paid_at: finalized.status_transitions?.paid_at ? new Date(finalized.status_transitions.paid_at * 1000).toISOString() : null,
      });
      results.push({ townId: billing.neighborhood_id, townName: town?.name, billingId: billing.id, invoiceId: finalized.id, status: finalized.status });
    } catch (error: any) {
      await updateBilling(client, billing.id, { status: "invoice_failed", stripe_last_error: String(error?.message || error).slice(0, 1000) });
      results.push({ townId: billing.neighborhood_id, billingId: billing.id, status: "invoice_failed", error: String(error?.message || error) });
    }
  }
  return { mode: "invoice", billingMonth, processed: results.length, results };
};
