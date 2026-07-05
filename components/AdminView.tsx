"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AdminViewProps = {
  townId: number;
  townName: string;
};

type Summary = {
  residents: number;
  notices: number;
  unpaid: number;
  paidTotal: number;
};

const adminModules = [
  { key: "members", title: "会員管理", desc: "名簿、LINE連携、退会状態を確認", icon: "fa-users", tone: "blue" },
  { key: "notices", title: "回覧板・通知", desc: "お知らせ作成、既読状況、配信管理", icon: "fa-bullhorn", tone: "cyan" },
  { key: "fees", title: "会費管理", desc: "請求、入金、Stripe決済状況", icon: "fa-yen-sign", tone: "amber" },
  { key: "budget", title: "予算・決算", desc: "科目、予算案、実績入力、CSV出力", icon: "fa-chart-pie", tone: "indigo" },
  { key: "events", title: "イベント", desc: "行事予定、参加確認、施設予約", icon: "fa-calendar-days", tone: "green" },
  { key: "settings", title: "システム設定", desc: "役員招待、権限、LINE/Stripe連携", icon: "fa-gear", tone: "slate" },
];

export default function AdminView({ townId, townName }: AdminViewProps) {
  const [summary, setSummary] = useState<Summary>({ residents: 0, notices: 0, unpaid: 0, paidTotal: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const [residents, notices, unpaidFees, paidFees] = await Promise.all([
          supabase.from("resident_rosters").select("id", { count: "exact", head: true }).eq("neighborhood_id", townId),
          supabase.from("circulars").select("id", { count: "exact", head: true }).eq("neighborhood_id", townId),
          supabase.from("fee_records").select("id", { count: "exact", head: true }).eq("neighborhood_id", townId).neq("status", "paid"),
          supabase.from("fee_records").select("paid_amount, paid_amount_cash, paid_amount_stripe").eq("neighborhood_id", townId),
        ]);

        const paidTotal = (paidFees.data || []).reduce((sum: number, row: any) => {
          return sum + (row.paid_amount || (row.paid_amount_cash || 0) + (row.paid_amount_stripe || 0));
        }, 0);

        setSummary({
          residents: residents.count || 0,
          notices: notices.count || 0,
          unpaid: unpaidFees.count || 0,
          paidTotal,
        });
      } catch (e) {
        console.error("Admin summary failed:", e);
      } finally {
        setLoading(false);
      }
    };

    if (townId) fetchSummary();
  }, [townId]);

  return (
    <main className="admin-dashboard">
      <section className="admin-hero">
        <div>
          <p className="el-kicker">el-town 管理</p>
          <h1>{townName}</h1>
          <p>町内会・自治会の運営状況を確認し、必要な管理機能へ進めます。</p>
        </div>
        <img src="/icon_el_town.png" alt="el-town" />
      </section>

      <section className="admin-summary-grid" aria-label="概要">
        <div className="admin-summary-card">
          <span>会員数</span>
          <strong>{loading ? "-" : summary.residents.toLocaleString()}</strong>
          <small>登録済み名簿</small>
        </div>
        <div className="admin-summary-card">
          <span>回覧</span>
          <strong>{loading ? "-" : summary.notices.toLocaleString()}</strong>
          <small>配信済み件数</small>
        </div>
        <div className="admin-summary-card warning">
          <span>未納</span>
          <strong>{loading ? "-" : summary.unpaid.toLocaleString()}</strong>
          <small>会費レコード</small>
        </div>
        <div className="admin-summary-card success">
          <span>入金額</span>
          <strong>{loading ? "-" : `¥${summary.paidTotal.toLocaleString()}`}</strong>
          <small>現金・Stripe合計</small>
        </div>
      </section>

      <section className="admin-module-grid" aria-label="管理機能">
        {adminModules.map((module) => (
          <button key={module.key} className={`admin-module-card ${module.tone}`} type="button">
            <span className="admin-module-icon"><i className={`fas ${module.icon}`} /></span>
            <span>
              <strong>{module.title}</strong>
              <small>{module.desc}</small>
            </span>
            <i className="fas fa-chevron-right" />
          </button>
        ))}
      </section>
    </main>
  );
}
