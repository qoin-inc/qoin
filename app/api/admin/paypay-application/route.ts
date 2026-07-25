import { NextResponse } from "next/server";
import { requireNeighborhoodAdmin } from "@/lib/stripeConnectServer";
import { createServiceClient, normalizeDisclosurePayload, syncPayPayCapability } from "@/lib/paypayServer";
import { isSystemAdminRequest } from "@/lib/systemAdminServer";

const requirePayPayManager = async (req: Request, townId: string | number) => {
  if (isSystemAdminRequest(req)) {
    return { writeClient: createServiceClient(), user: { id: null } };
  }
  return requireNeighborhoodAdmin(req, townId);
};

const loadApplication = async (writeClient: any, townId: string | number) => {
  const [townResult, feeResult, disclosureResult, requestResult] = await Promise.all([
    writeClient
      .from("neighborhoods")
      .select("id,name,stripe_account_id,stripe_paypay_status,stripe_paypay_last_error,stripe_paypay_updated_at")
      .eq("id", townId)
      .single(),
    writeClient.from("neighborhood_fee_settings").select("*").eq("neighborhood_id", townId).maybeSingle(),
    writeClient.from("neighborhood_commercial_disclosures").select("*").eq("neighborhood_id", townId).maybeSingle(),
    writeClient
      .from("neighborhood_payment_change_requests")
      .select("*")
      .eq("neighborhood_id", townId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  if (townResult.error) throw townResult.error;
  return {
    town: townResult.data,
    feeSetting: feeResult.data,
    disclosure: disclosureResult.data,
    request: requestResult.data,
  };
};

export async function GET(req: Request) {
  try {
    const townId = new URL(req.url).searchParams.get("townId") || "";
    if (!townId) return NextResponse.json({ error: "町内会・自治会を指定してください。" }, { status: 400 });
    const { writeClient } = await requirePayPayManager(req, townId);
    let application = await loadApplication(writeClient, townId);

    if (application.town?.stripe_account_id) {
      try {
        await syncPayPayCapability(townId, application.town.stripe_account_id);
        application = await loadApplication(writeClient, townId);
      } catch {
        // PayPayが未提供・未申請のアカウントでも申請フォームは利用できるようにする。
      }
    }

    return NextResponse.json({
      ...application,
      publicUrl: application.disclosure?.publication_status === "published"
        ? `${process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin}/legal/commercial-transactions/${townId}`
        : null,
      businessPublicUrl: application.disclosure?.publication_status === "published"
        ? `${process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin}/neighborhoods/${townId}`
        : null,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "PayPay申請情報を取得できませんでした。" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const townId = String(body?.townId || "");
    const action = String(body?.action || "");
    if (!townId) return NextResponse.json({ error: "町内会・自治会を指定してください。" }, { status: 400 });
    if (!["enable_paypay", "update_paypay", "disable_paypay"].includes(action)) {
      return NextResponse.json({ error: "申請種別が正しくありません。" }, { status: 400 });
    }

    const { writeClient, user } = await requirePayPayManager(req, townId);
    const current = await loadApplication(writeClient, townId);
    if (current.request?.status === "pending") {
      return NextResponse.json({ error: "すでに運営確認中の申請があります。" }, { status: 409 });
    }
    if (!current.town?.stripe_account_id && action !== "disable_paypay") {
      return NextResponse.json({ error: "先にStripe本番連携を完了してください。" }, { status: 400 });
    }

    let requestedPayload: Record<string, any> = {};
    if (action !== "disable_paypay") {
      requestedPayload = normalizeDisclosurePayload(body?.disclosure, {
        sellerName: current.town.name,
        feeName: current.feeSetting?.fee_name || "年会費",
        feeAmount: Number(current.feeSetting?.amount || 0),
      });
      requestedPayload.goods_type = body?.goodsType === "digital_content" ? "digital_content" : "general";
    }

    const { data, error } = await writeClient
      .from("neighborhood_payment_change_requests")
      .insert({
        neighborhood_id: townId,
        request_type: action,
        status: "pending",
        requested_payload: requestedPayload,
        requested_by: user.id,
      })
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({
      request: data,
      message: action === "disable_paypay"
        ? "PayPay利用停止をel-town運営へ申請しました。承認までは現在の公開・決済設定を維持します。"
        : "PayPayの利用・掲載内容をel-town運営へ申請しました。承認後に法定ページを自動公開し、Stripe審査へ進みます。",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "PayPay申請を登録できませんでした。" }, { status: 500 });
  }
}
