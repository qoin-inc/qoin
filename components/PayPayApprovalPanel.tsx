"use client";

import React, { useEffect, useMemo, useState } from "react";

const requestLabel = (type: string) => ({
  enable_paypay: "利用開始",
  update_paypay: "掲載内容変更",
  disable_paypay: "利用停止",
}[type] || type);

const statusLabel = (status: string) => ({
  pending: "確認待ち",
  approved: "承認済み",
  rejected: "差し戻し",
  cancelled: "取消",
}[status] || status);

export default function PayPayApprovalPanel() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/system/paypay-requests");
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "申請一覧を取得できませんでした。");
      setRequests(data.requests || []);
    } catch (error: any) {
      setMessage(error?.message || "申請一覧を取得できませんでした。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const decide = async (request: any, decision: "approve" | "reject") => {
    const note = window.prompt(
      decision === "approve" ? "確認メモ（任意）" : "差し戻し理由を入力してください。",
      decision === "approve" ? "" : "入力内容または確認書類を修正してください。",
    );
    if (note === null || (decision === "reject" && !note.trim())) return;
    if (!window.confirm(`${request.town?.name || "この団体"}の${requestLabel(request.request_type)}申請を${decision === "approve" ? "承認" : "差し戻し"}ます。よろしいですか？`)) return;
    setBusyId(request.id);
    setMessage("");
    try {
      const response = await fetch("/api/system/paypay-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: request.id, decision, reviewNote: note }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "申請を処理できませんでした。");
      setMessage(data.message);
      await load();
    } catch (error: any) {
      setMessage(error?.message || "申請を処理できませんでした。");
    } finally {
      setBusyId("");
    }
  };

  const visibleRequests = useMemo(
    () => requests.filter((request) => showHistory || request.status === "pending"),
    [requests, showHistory],
  );
  const pendingCount = requests.filter((request) => request.status === "pending").length;

  return (
    <>
      <section className="system-admin-card accent">
        <div className="system-admin-heading">
          <div>
            <p className="el-kicker">Stripe Connect</p>
            <h2>PayPay申請の運営承認</h2>
            <p>町内会・自治会からの利用開始、掲載内容変更、利用停止を確認します。</p>
          </div>
          <span>{pendingCount}件確認待ち</span>
        </div>
        <div className="paypay-workflow">
          <span>団体が申請</span><i>→</i><span>運営が確認</span><i>→</i><span>法定ページ公開・変更</span><i>→</i><span>Stripeへ反映</span>
        </div>
        <button type="button" className="system-admin-primary" onClick={() => setShowHistory((value) => !value)}>
          {showHistory ? "確認待ちだけ表示" : "処理履歴も表示"}
        </button>
        {message && <div className={`system-admin-message ${message.includes("できません") ? "error" : ""}`}>{message}</div>}
      </section>

      {loading ? (
        <section className="system-admin-card">申請情報を読み込んでいます。</section>
      ) : visibleRequests.length === 0 ? (
        <section className="system-admin-card">現在、確認が必要なPayPay申請はありません。</section>
      ) : (
        <section className="paypay-review-list">
          {visibleRequests.map((request) => {
            const payload = request.requested_payload || {};
            return (
              <article className="system-admin-card paypay-review-card" key={request.id}>
                <div className="admin-basic-card-heading">
                  <div>
                    <p className="el-kicker">{requestLabel(request.request_type)}</p>
                    <h2>{request.town?.name || `団体ID ${request.neighborhood_id}`}</h2>
                    <p>{new Date(request.created_at).toLocaleString("ja-JP")}</p>
                  </div>
                  <span className={`admin-stripe-badge ${request.status === "approved" ? "ready" : request.status === "pending" ? "pending" : ""}`}>
                    {statusLabel(request.status)}
                  </span>
                </div>

                {request.request_type !== "disable_paypay" && (
                  <dl className="admin-definition-list">
                    <div><dt>団体名</dt><dd>{payload.seller_name}</dd></div>
                    <div><dt>運営責任者</dt><dd>{payload.representative_name}</dd></div>
                    <div><dt>所在地</dt><dd>〒{payload.postal_code} {payload.address}</dd></div>
                    <div><dt>電話</dt><dd>{payload.phone}</dd></div>
                    <div><dt>メール</dt><dd>{payload.email}</dd></div>
                    <div><dt>会費</dt><dd>{payload.fee_name}　¥{Number(payload.fee_amount || 0).toLocaleString()}</dd></div>
                    <div><dt>取扱内容</dt><dd>{payload.goods_type === "digital_content" ? "デジタルコンテンツ" : "一般"}</dd></div>
                    <div><dt>返金条件</dt><dd>{payload.cancellation_refund}</dd></div>
                  </dl>
                )}

                {request.status === "pending" && (
                  <div className="system-admin-actions">
                    <button type="button" className="system-admin-primary" disabled={busyId === request.id} onClick={() => void decide(request, "approve")}>承認して反映</button>
                    <button type="button" className="danger" disabled={busyId === request.id} onClick={() => void decide(request, "reject")}>差し戻す</button>
                  </div>
                )}
                {request.review_note && <p className="admin-basic-note">確認メモ：{request.review_note}</p>}
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}
