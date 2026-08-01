"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

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
    suggestions: ["電子回覧板の見方", "会費の確認", "Liveの参加", "設定について"],
  },
  admin: {
    title: "役員の方のヘルプ",
    manualHref: "/manual/admin",
    manualLabel: "役員管理画面マニュアルを見る",
    suggestions: ["電子回覧板を配信", "会員を管理", "会費を管理", "役員を追加"],
  },
} as const;

function answerHelpQuestion(audience: HelpAudience, question: string) {
  const normalized = question.trim().toLowerCase();
  if (!normalized) return "質問を入力してください。";

  if (audience === "member") {
    if (/回覧|お知らせ|連絡|イベント/.test(normalized)) return "「電子回覧板」を開くと、回覧板・連絡・イベントを確認できます。カードを押すと詳細が開きます。";
    if (/会費|支払|決済|領収/.test(normalized)) return "「会費」から、請求額・入金状況・支払い方法を確認できます。オンライン支払い後も同じ画面で状態をご確認ください。";
    if (/live|ライブ|施設|予約/.test(normalized)) return "「Live」から開催予定を選べます。施設予約はLive画面内の「施設予約」へ切り替えてください。";
    if (/設定|退会|登録情報|名前/.test(normalized)) return "「設定」で登録情報を確認できます。退会申請も設定画面から行えます。";
    return "詳しい手順は会員向け操作マニュアルで確認できます。「回覧板」「会費」「Live」「設定」などの言葉を入れて質問してください。";
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

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    ask(question);
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
              <div className="help-center-suggestions" aria-label="よくある質問">
                {content.suggestions.map((suggestion) => <button key={suggestion} type="button" onClick={() => ask(suggestion)}>{suggestion}</button>)}
              </div>
              <form className="help-center-form" onSubmit={handleSubmit}>
                <label htmlFor={`help-question-${audience}`}>チャットでかんたん質問</label>
                <div>
                  <input id={`help-question-${audience}`} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例：会費の確認方法" />
                  <button type="submit" aria-label="質問を送る"><i className="fas fa-paper-plane" /></button>
                </div>
              </form>
              <small className="help-center-note">個人情報やパスワードは入力しないでください。</small>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
