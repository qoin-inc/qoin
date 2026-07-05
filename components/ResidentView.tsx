"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type ResidentViewProps = {
  townId?: number;
  townName?: string;
  residentName?: string;
  userId?: string;
  openTargetId?: string | null;
  initialTab?: string | null;
};

type Circular = {
  id: number;
  title: string;
  content?: string | null;
  body?: string | null;
  created_at?: string | null;
  published_at?: string | null;
  author_name?: string | null;
  is_read?: boolean;
};

const tabs = [
  { id: "home", label: "ホーム", icon: "fa-home" },
  { id: "notice", label: "回覧", icon: "fa-bullhorn" },
  { id: "payment", label: "会費", icon: "fa-credit-card" },
  { id: "profile", label: "設定", icon: "fa-user" },
] as const;

export default function ResidentView({ townId, townName, residentName, userId, openTargetId, initialTab }: ResidentViewProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>((initialTab as any) || (openTargetId ? "notice" : "home"));
  const [circulars, setCirculars] = useState<Circular[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCircular, setSelectedCircular] = useState<Circular | null>(null);

  useEffect(() => {
    const fetchCirculars = async () => {
      if (!townId) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("circulars")
        .select("*")
        .eq("neighborhood_id", townId)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setCirculars(data as Circular[]);
        const target = openTargetId ? (data as Circular[]).find((item) => String(item.id) === String(openTargetId)) : null;
        if (target) setSelectedCircular(target);
      }
      setLoading(false);
    };

    fetchCirculars();
  }, [townId, openTargetId]);

  const latest = circulars.slice(0, 3);
  const unreadCount = circulars.filter((item) => !item.is_read).length;
  const displayName = residentName || "会員";
  const placeName = townName || "町内会・自治会";

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric" }), []);

  const formatDate = (item: Circular) => {
    const raw = item.published_at || item.created_at;
    if (!raw) return "日付未設定";
    return dateFormatter.format(new Date(raw));
  };

  const bodyText = (item: Circular) => item.content || item.body || "本文はまだ登録されていません。";

  if (selectedCircular) {
    return (
      <div className="el-phone-screen">
        <header className="el-mobile-header compact">
          <button className="el-icon-button" onClick={() => setSelectedCircular(null)} aria-label="戻る">
            <i className="fas fa-arrow-left" />
          </button>
          <div>
            <p className="el-kicker">回覧板</p>
            <h1>{selectedCircular.title}</h1>
          </div>
        </header>
        <main className="el-scroll-area el-detail">
          <span className="el-pill">{formatDate(selectedCircular)}</span>
          <h2>{selectedCircular.title}</h2>
          <p className="el-meta"><i className="fas fa-user-circle" /> {selectedCircular.author_name || placeName}</p>
          <article className="el-message-box">{bodyText(selectedCircular)}</article>
          <button className="el-primary-action"><i className="fas fa-check" /> 確認しました</button>
        </main>
      </div>
    );
  }

  return (
    <div className="el-phone-screen">
      <header className="el-mobile-header">
        <div>
          <p className="el-kicker">{placeName}</p>
          <h1>{displayName}さん</h1>
        </div>
        <img src="/icon_el_town.png" alt="el-town" className="el-header-logo" />
      </header>

      <main className="el-scroll-area">
        {activeTab === "home" && (
          <div className="el-stack">
            <section className="el-hero-panel">
              <div>
                <p className="el-kicker">LINEで使える町内会アプリ</p>
                <h2>今日の確認</h2>
                <p>未読の回覧や会費状況をここから確認できます。</p>
              </div>
              <div className="el-count-badge">
                <strong>{unreadCount}</strong>
                <span>未読</span>
              </div>
            </section>

            <section>
              <div className="el-section-title">
                <h2>新着回覧</h2>
                <button onClick={() => setActiveTab("notice")}>すべて</button>
              </div>
              {loading ? (
                <div className="el-empty"><i className="fas fa-spinner fa-spin" /> 読み込み中...</div>
              ) : latest.length > 0 ? (
                <div className="el-list">
                  {latest.map((item) => (
                    <button key={item.id} className="el-list-item" onClick={() => setSelectedCircular(item)}>
                      <span className="el-date">{formatDate(item)}</span>
                      <strong>{item.title}</strong>
                      <small>{bodyText(item)}</small>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="el-empty">現在表示できる回覧はありません。</div>
              )}
            </section>
          </div>
        )}

        {activeTab === "notice" && (
          <section className="el-stack">
            <div className="el-section-title"><h2>回覧板</h2></div>
            <div className="el-list">
              {circulars.map((item) => (
                <button key={item.id} className="el-list-item" onClick={() => setSelectedCircular(item)}>
                  <span className="el-date">{formatDate(item)}</span>
                  <strong>{item.title}</strong>
                  <small>{bodyText(item)}</small>
                </button>
              ))}
              {!loading && circulars.length === 0 && <div className="el-empty">回覧はまだありません。</div>}
            </div>
          </section>
        )}

        {activeTab === "payment" && (
          <section className="el-stack">
            <div className="el-status-card accent">
              <p className="el-kicker">会費</p>
              <h2>支払い状況</h2>
              <p>会費のオンライン決済や支払い履歴は準備中です。</p>
            </div>
          </section>
        )}

        {activeTab === "profile" && (
          <section className="el-stack">
            <div className="el-status-card">
              <p className="el-kicker">登録情報</p>
              <h2>{displayName}</h2>
              <p>{placeName} に連携済みです。</p>
              <Link href="/" className="el-secondary-action">トップへ戻る</Link>
            </div>
          </section>
        )}
      </main>

      <nav className="el-bottom-nav" aria-label="住民メニュー">
        {tabs.map((tab) => (
          <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}>
            <i className={`fas ${tab.icon}`} />
            <span>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
