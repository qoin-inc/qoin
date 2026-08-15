"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type HelpAudience = "member" | "admin";

type HelpCenterProps = {
  audience: HelpAudience;
  showLabel?: boolean;
  className?: string;
};

const helpContent = {
  member: {
    title: "会員の方のヘルプ",
    manualHref: "/manual/member",
    manualLabel: "会員向け操作マニュアルを見る",
    sectionLabel: "知りたい操作を選ぶ",
    suggestions: [
      { label: "回覧板を見る", description: "電子回覧板・連絡", icon: "fa-clipboard-list" },
      { label: "イベントに回答する", description: "予定確認・参加人数", icon: "fa-calendar-check" },
      { label: "会費を確認・支払う", description: "請求額・入金状況・領収書", icon: "fa-yen-sign" },
      { label: "Live・総会に参加する", description: "予定確認・参加申込・接続", icon: "fa-video" },
      { label: "施設を予約する", description: "空き状況・申込・変更", icon: "fa-building" },
      { label: "登録情報を確認する", description: "会員情報・家族・退会", icon: "fa-gear" },
    ],
  },
  admin: {
    title: "役員の方のヘルプ",
    manualHref: "/manual/admin",
    manualLabel: "役員管理画面マニュアルを見る",
    sectionLabel: "よくある質問",
    suggestions: [
      { label: "電子回覧板を配信", icon: "fa-paper-plane" },
      { label: "会員を管理", icon: "fa-users" },
      { label: "会費を管理", icon: "fa-yen-sign" },
      { label: "役員を追加", icon: "fa-user-plus" },
    ],
  },
} as const;

function answerHelpQuestion(audience: HelpAudience, question: string) {
  const normalized = question.trim().toLowerCase();
  if (!normalized) return "質問を入力してください。";

  if (audience === "member") {
    if (/イベント|行事|参加人数|出欠/.test(normalized) && !/総会/.test(normalized)) return "画面下の「回覧板」を押し、下部メニューの「イベント」を選びます。予定のカードを押して詳細を開き、参加する人数を入力して回答してください。";
    if (/回覧|お知らせ|連絡|掲示/.test(normalized)) return "画面下の「回覧板」を押し、「すべて・電子回覧板・連絡」から種類を選びます。読みたいカードを押すと詳しい内容や添付資料を確認できます。";
    if (/会費|支払|決済|領収|請求|入金/.test(normalized)) return "画面下の「会費」を押すと、請求額・入金状況・支払い方法を確認できます。未納の場合は表示された方法で支払い、入金後は同じ画面で状態と領収書を確認してください。会費の状態は同じ世帯で共有されます。";
    if (/施設|予約|集会所|会館/.test(normalized)) return "画面下の「Live」を押し、下部メニューを「施設予約」に切り替えます。カレンダーで日付と空き状況を確認し、施設・時間・人数・用途を入力して申し込んでください。申込後の内容も同じ画面で確認できます。";
    if (/live|ライブ|web会議|ウェブ会議|総会|参加|接続/.test(normalized)) return "画面下の「Live」を押し、Liveまたは総会の予定を選びます。必要に応じて参加人数を入力して申し込み、開始時刻になったら詳細画面の参加ボタンからWeb会議を開いてください。";
    if (/設定|退会|登録情報|名前|家族|プロフィール/.test(normalized)) return "画面下の「設定」を押すと、登録情報と家族の連携状況を確認できます。退会する場合は「退会手続き」から申請してください。退会すると会員画面を利用できなくなります。";
    return "知りたい操作を上の一覧から選ぶか、「回覧板の出欠」「施設予約」「領収書」のように、したいことを入力してください。詳しい画面付き手順は会員向け操作マニュアルで確認できます。";
  }

  if (/回覧|配信|お知らせ|連絡|イベント/.test(normalized)) return "「発信機能」を開き、「電子回覧板」などの配信種別を選んで作成します。";
  if (/会員|名簿|世帯/.test(normalized)) return "「基本機能」→「会員管理」から、会員名簿の確認・登録・修正を行えます。";
  if (/会費|支払|決済|stripe/.test(normalized)) return "「基本機能」→「会費管理」から請求と入金状況を確認できます。決済連携は「Stripe連携」を開いてください。";
  if (/役員|招待|管理者/.test(normalized)) return "「基本機能」→「役員管理」から役員を招待できます。招待された方には登録用メールが送信されます。";
  if (/live|ライブ|施設|予約/.test(normalized)) return "「Live・施設予約」を開くと、配信URLの登録、施設登録、予約承認を行えます。";
  return "詳しい手順は役員管理画面マニュアルで確認できます。「配信」「会員」「会費」「役員」「Live」などの言葉を入れて質問してください。";
}

export default function HelpCenter({ audience, showLabel = true, className = "" }: HelpCenterProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("下の候補を選ぶか、知りたい操作を入力してください。");
  const [asking, setAsking] = useState(false);
  const content = helpContent[audience];

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const ask = (value: string) => {
    setQuestion(value);
    setAnswer(answerHelpQuestion(audience, value));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || asking) {
      if (!trimmedQuestion) setAnswer("質問を入力してください。");
      return;
    }

    setAsking(true);
    setAnswer("回答を考えています…");
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("ログイン情報を確認できませんでした。");

      const response = await fetch("/api/help/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ audience, question: trimmedQuestion }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.answer) throw new Error(result.error || "回答を取得できませんでした。");
      setAnswer(result.answer);
    } catch {
      setAnswer(`${answerHelpQuestion(audience, trimmedQuestion)}（現在AIによる詳しい回答を利用できないため、基本案内を表示しています。）`);
    } finally {
      setAsking(false);
    }
  };

  return (
    <>
      <button type="button" className={`help-center-trigger ${className}`.trim()} onClick={() => setOpen(true)} aria-label={content.title} title={content.title}>
        <i className="fas fa-circle-question" aria-hidden="true" />
        {showLabel && <span>ヘルプ</span>}
      </button>

      {open && (
        <div className="help-center-overlay" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}>
          <section className="help-center-dialog" role="dialog" aria-modal="true" aria-labelledby={`help-center-title-${audience}`}>
            <header className="help-center-header">
              <div><p>el-town HELP</p><h2 id={`help-center-title-${audience}`}>{content.title}</h2></div>
              <button type="button" className="help-center-close" onClick={() => setOpen(false)} aria-label="ヘルプを閉じる"><i className="fas fa-xmark" /></button>
            </header>

            <Link href={content.manualHref} className="help-center-manual" onClick={() => setOpen(false)}>
              <i className="fas fa-book-open" />
              <span><strong>{content.manualLabel}</strong><small>画像付きの手順を確認できます</small></span>
              <i className="fas fa-chevron-right" />
            </Link>

            <div className="help-center-chat">
              <div className="help-center-bot-answer" aria-live="polite"><i className="fas fa-comments" /><p>{answer}</p></div>
              <p className="help-center-section-label">{content.sectionLabel}</p>
              <div className={`help-center-suggestions ${audience === "member" ? "is-operation-grid" : ""}`} aria-label={content.sectionLabel}>
                {content.suggestions.map((suggestion) => (
                  <button key={suggestion.label} type="button" onClick={() => ask(suggestion.label)}>
                    <i className={`fas ${suggestion.icon}`} aria-hidden="true" />
                    <span>
                      <strong>{suggestion.label}</strong>
                      {"description" in suggestion && <small>{suggestion.description}</small>}
                    </span>
                  </button>
                ))}
              </div>
              <form className="help-center-form" onSubmit={handleSubmit}>
                <label htmlFor={`help-question-${audience}`}>チャットでかんたん質問</label>
                <div>
                  <input id={`help-question-${audience}`} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例：会費の確認方法" maxLength={300} disabled={asking} />
                  <button type="submit" aria-label="質問を送る" disabled={asking}><i className={`fas ${asking ? "fa-spinner fa-spin" : "fa-paper-plane"}`} /></button>
                </div>
              </form>
              <small className="help-center-note">AIが操作方法を回答します。個人情報やパスワードは入力しないでください。</small>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
