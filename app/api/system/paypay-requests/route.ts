import { NextResponse } from "next/server";
import { isSystemAdminRequest } from "@/lib/systemAdminServer";
import {
  createPayPayStripeClient,
  createServiceClient,
  normalizeDisclosurePayload,
  payPayCapabilityStatus,
} from "@/lib/paypayServer";

export async function GET(req: Request) {
  if (!isSystemAdminRequest(req)) return NextResponse.json({ error: "運営管理者のログインが必要です。" }, { status: 401 });
  try {
    const service = createServiceClient();
    const [{ data: requests, error }, { data: towns }] = await Promise.all([
      service
        .from("neighborhood_payment_change_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      service
        .from("neighborhoods")
        .select("id,name,stripe_account_id,stripe_paypay_status,stripe_paypay_last_error"),
    ]);
    if (error) throw error;
    const townMap = new Map((towns || []).map((town: any) => [String(town.id), town]));
    return NextResponse.json({
      requests: (requests || []).map((request: any) => ({
        ...request,
        town: townMap.get(String(request.neighborhood_id)) || null,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "PayPay申請一覧を取得できませんでした。" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isSystemAdminRequest(req)) return NextResponse.json({ error: "運営管理者のログインが必要です。" }, { status: 401 });
  try {
    const body = await req.json();
    const requestId = String(body?.requestId || "");
    const decision = String(body?.decision || "");
    const reviewNote = String(body?.reviewNote || "").trim().slice(0, 1000);
    if (!requestId || !["approve", "reject"].includes(decision)) {
      return NextResponse.json({ error: "承認対象と操作を指定してください。" }, { status: 400 });
    }

    const service = createServiceClient();
    const { data: requestRow, error: requestError } = await service
      .from("neighborhood_payment_change_requests")
      .select("*")
      .eq("id", requestId)
      .single();
    if (requestError || !requestRow) throw requestError || new Error("申請が見つかりません。");
    if (requestRow.status !== "pending") {
      return NextResponse.json({ error: "この申請はすでに処理されています。" }, { status: 409 });
    }

    if (decision === "reject") {
      const { error } = await service.from("neighborhood_payment_change_requests").update({
        status: "rejected",
        reviewed_by: "el-town運営",
        review_note: reviewNote || "申請内容を確認してください。",
        reviewed_at: new Date().toISOString(),
      }).eq("id", requestId).eq("status", "pending");
      if (error) throw error;
      return NextResponse.json({ message: "申請を差し戻しました。" });
    }

    const townId = requestRow.neighborhood_id;
    const { data: town, error: townError } = await service
      .from("neighborhoods")
      .select("id,name,stripe_account_id")
      .eq("id", townId)
      .single();
    if (townError || !town) throw townError || new Error("町内会・自治会が見つかりません。");

    const now = new Date().toISOString();
    if (requestRow.request_type === "disable_paypay") {
      const operations = await Promise.all([
        service.from("neighborhood_commercial_disclosures").update({
          publication_status: "withdrawn",
          withdrawn_at: now,
          updated_at: now,
        }).eq("neighborhood_id", townId),
        service.from("neighborhood_fee_settings").update({
          stripe_paypay_enabled: false,
        }).eq("neighborhood_id", townId),
        service.from("neighborhoods").update({
          stripe_paypay_status: "inactive",
          stripe_paypay_last_error: null,
          stripe_paypay_updated_at: now,
        }).eq("id", townId),
      ]);
      const operationError = operations.find((result) => result.error)?.error;
      if (operationError) throw operationError;
    } else {
      if (!town.stripe_account_id) throw new Error("この団体はStripe Connectに未登録です。");
      const payload = normalizeDisclosurePayload(requestRow.requested_payload, {
        sellerName: town.name,
        feeName: "年会費",
        feeAmount: 0,
      });
      const legalUrl = `${process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin}/legal/commercial-transactions/${townId}`;
      const businessUrl = `${process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin}/neighborhoods/${townId}`;
      const stripe = createPayPayStripeClient();
      let account;
      try {
        account = await stripe.accounts.update(town.stripe_account_id, {
          capabilities: {
            paypay_payments: { requested: true },
          },
          business_profile: {
            url: businessUrl,
            specified_commercial_transactions_act_url: legalUrl,
          },
          settings: {
            paypay_payments: {
              goods_type: requestRow.requested_payload?.goods_type === "digital_content" ? "digital_content" : "general",
            },
          },
        } as any);
      } catch (stripeError: any) {
        const stripeMessage = String(stripeError?.message || "StripeへPayPay申請を送信できませんでした。");
        await service.from("neighborhoods").update({
          stripe_paypay_last_error: stripeMessage.slice(0, 1000),
          stripe_paypay_updated_at: now,
        }).eq("id", townId);
        return NextResponse.json({ error: stripeMessage }, { status: 502 });
      }

      const paypayStatus = payPayCapabilityStatus(account);
      const { error: disclosureError } = await service.from("neighborhood_commercial_disclosures").upsert({
        neighborhood_id: townId,
        publication_status: "published",
        ...payload,
        published_at: now,
        withdrawn_at: null,
        updated_at: now,
      }, { onConflict: "neighborhood_id" });
      if (disclosureError) throw disclosureError;

      const operations = await Promise.all([
        service.from("neighborhood_fee_settings").update({
          stripe_paypay_enabled: paypayStatus === "active",
        }).eq("neighborhood_id", townId),
        service.from("neighborhoods").update({
          stripe_paypay_status: paypayStatus === "not_requested" ? "pending" : paypayStatus,
          stripe_paypay_last_error: null,
          stripe_paypay_updated_at: now,
        }).eq("id", townId),
      ]);
      const operationError = operations.find((result) => result.error)?.error;
      if (operationError) throw operationError;
    }

    const { error: approvalError } = await service.from("neighborhood_payment_change_requests").update({
      status: "approved",
      reviewed_by: "el-town運営",
      review_note: reviewNote || null,
      reviewed_at: now,
    }).eq("id", requestId).eq("status", "pending");
    if (approvalError) throw approvalError;

    return NextResponse.json({
      message: requestRow.request_type === "disable_paypay"
        ? "利用停止を承認し、会員向けPayPay表示と法定ページを非公開にしました。"
        : "申請を承認し、法定ページを公開してStripeへPayPay申請を送信しました。",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "PayPay申請を処理できませんでした。" }, { status: 500 });
  }
}
