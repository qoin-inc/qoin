"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type HelpAudience = "member" | "admin";
type ChatMessage = { role: "user" | "assistant"; content: string };
type HelpOperation = { label: string; description: string; answer: string };
type MemberCategory = { id: string; label: string; description: string; icon: string; operations: HelpOperation[] };

type HelpCenterProps = {
  audience: HelpAudience;
  showLabel?: boolean;
  className?: string;
};

const memberCategories: MemberCategory[] = [
  {
    id: "board", label: "回覧板", description: "全て・電子回覧板・連絡・イベント", icon: "fa-clipboard-list",
    operations: [
      { label: "全て", description: "すべての発信を見る", answer: "「回覧板」→「全て」を押すと、電子回覧板・連絡・イベントをまとめて確認できます。読みたいカードを押すと詳細が開きます。" },
      { label: "電子回覧板", description: "回覧内容を見る", answer: "「回覧板」→「電子回覧板」を押すと、電子回覧板だけを表示できます。カードを押すと本文、配信日、添付資料を確認できます。" },
      { label: "連絡", description: "役員からの連絡を見る", answer: "「回覧板」→「連絡」を押すと、役員からの連絡だけを表示できます。カードを押して詳しい内容を確認してください。" },
      { label: "イベント", description: "予定確認・参加回答", answer: "「回覧板」→「イベント」を押すと、イベント予定を確認できます。カードまたはカレンダーから予定を開き、参加人数を回答してください。" },
    ],
  },
  {
    id: "payment", label: "会費", description: "請求・支払い・領収書", icon: "fa-yen-sign",
    operations: [
      { label: "会費", description: "請求・入金・支払い", answer: "「会費」→「会費」を押すと、請求額、入金額、納入状態、支払い方法を確認できます。未納の場合は表示された方法で支払い、入金後は領収書を表示できます。会費の状態は同じ世帯で共有されます。" },
    ],
  },
  {
    id: "live", label: "Live", description: "Live・総会・施設予約", icon: "fa-video",
    operations: [
      { label: "Live", description: "Live・総会に参加", answer: "「Live」→「Live」を押すと、Liveと総会の予定を確認できます。予定を開いて参加人数を申し込み、開始時刻になったら参加ボタンからWeb会議を開いてください。総会は回覧板ではなく、ここに表示されます。" },
      { label: "施設予約", description: "空き状況・申込・変更", answer: "「Live」→「施設予約」を押すと、施設の空き状況を確認できます。施設、日付、時間、人数、用途を入力して申し込み、申込後は内容の変更や取り消しもできます。" },
    ],
  },
  {
    id: "settings", label: "設定", description: "退会申請", icon: "fa-gear",
    operations: [
      { label: "退会申請", description: "会員登録を終了", answer: "「設定」→「退会申請」を押し、画面の案内に従って申請してください。退会すると、この町内会・自治会の会員画面を利用できなくなります。" },
    ],
  },
];

const adminSuggestions = [
  { label: "電子回覧板を配信", icon: "fa-paper-plane" },
  { label: "会員を管理", icon: "fa-users" },
  { label: "会費を管理", icon: "fa-yen-sign" },
  { label: "役員を追加", icon: "fa-user-plus" },
];

function answerHelpQuestion(audience: HelpAudience, question: string) {
  const normalized = question.trim().toLowerCase();
  if (!normalized) return "質問を入力してください。";
  if (audience === "member") {
    if (/(イベント|行事|参加人数|出欠).*(変更|修正|やり直|訂正)|(変更|修正|やり直|訂正).*(イベント|行事|参加人数|出欠)/.test(normalized) && !/総会/.test(normalized)) return "変更できます。画面下の「回覧板」→「イベント」の順に押し、回答済みの予定をもう一度開いてください。大人・子供の人数を修正し、「参加人数を変更する」を押すと更新できます。";
    if (/イベント|行事|参加人数|出欠/.test(normalized) && !/総会/.test(normalized)) return "画面下の「回覧板」→「イベント」の順に押します。予定を開き、大人・子供の参加人数を入力して「参加申込を保存する」を押してください。回答後も同じ予定を開き直せば人数を変更できます。";
    if (/回覧|お知らせ|連絡|掲示/.test(normalized)) return "画面下の「回覧板」を押し、「電子回覧板」または「連絡」を選びます。カードを押すと詳しい内容や添付資料を確認できます。";
    if (/会費|支払|決済|領収|請求|入金/.test(normalized)) return "画面下の「会費」を押すと、請求額・入金状況・支払い方法を確認できます。入金後は同じ画面で領収書を確認してください。";
    if (/施設|予約|集会所|会館/.test(normalized)) return "画面下の「Live」を押し、「施設予約」に切り替えます。空き状況を確認し、施設・時間・人数・用途を入力して申し込んでください。";
    if (/live|ライブ|web会議|ウェブ会議|総会|参加|接続/.test(normalized)) return "画面下の「Live」を押し、Liveまたは総会を選びます。参加を申し込み、開始時刻になったら参加ボタンからWeb会議を開いてください。";
    if (/設定|退会|登録情報|名前|家族|プロフィール/.test(normalized)) return "画面下の「設定」を押すと、登録情報と家族の連携状況を確認できます。退会は「退会手続き」から申請してください。";
    return "このヘルプでは確認できないため、町内会・自治会の役員へお問い合わせください。";
  }
  if (/回覧|配信|お知らせ|連絡|イベント/.test(normalized)) return "「発信機能」を開き、配信種別を選んで作成します。";
  if (/会員|名簿|世帯/.test(normalized)) return "「基本機能」→「会員管理」から、会員名簿の確認・登録・修正を行えます。";
  if (/会費|支払|決済|stripe/.test(normalized)) return "「基本機能」→「会費管理」から請求と入金状況を確認できます。";
  if (/役員|招待|管理者/.test(normalized)) return "「基本機能」→「役員管理」から役員を招待できます。";
  if (/live|ライブ|施設|予約/.test(normalized)) return "「Live・施設予約」から配信URL、施設、予約を管理できます。";
  return "このヘルプでは確認できないため、操作マニュアルを確認してください。";
}

const initialChat: ChatMessage[] = [{ role: "assistant", content: "操作について分からないことを質問してください。続けて質問することもできます。" }];
const initialOperationAnswer = "知りたい操作のカテゴリを選んでください。";

export default function HelpCenter({ audience, showLabel = true, className = "" }: HelpCenterProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [operationAnswer, setOperationAnswer] = useState(initialOperationAnswer);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(initialChat);
  const chatLogRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const helpSessionRef = useRef(0);
  const selectedCategory = memberCategories.find((category) => category.id === selectedCategoryId);
  const title = audience === "member" ? "会員の方のヘルプ" : "役員の方のヘルプ";

  const resetHelpState = useCallback(() => {
    helpSessionRef.current += 1;
    setSelectedCategoryId("");
    setOperationAnswer(initialOperationAnswer);
    setQuestion("");
    setAsking(false);
    setChatMessages(initialChat);
  }, []);

  const closeHelp = useCallback(() => {
    resetHelpState();
    setOpen(false);
  }, [resetHelpState]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeHelp(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [closeHelp, open]);

  useEffect(() => {
    if (chatLogRef.current) chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
  }, [asking, chatMessages]);

  const openHelp = () => {
    resetHelpState();
    setOpen(true);
    window.requestAnimationFrame(() => {
      if (dialogRef.current) dialogRef.current.scrollTop = 0;
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || asking) return;
    const helpSession = helpSessionRef.current;
    const history = chatMessages.slice(-6);
    setQuestion("");
    setChatMessages((current) => [...current, { role: "user", content: trimmedQuestion }]);
    setAsking(true);
    try {
      const { data } = await supabase.auth.getSession();
      const accessToken = data.session?.access_token;
      if (!accessToken) throw new Error("ログイン情報を確認できませんでした。");
      const response = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ audience, question: trimmedQuestion, history }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.answer) throw new Error(result.error || "回答を取得できませんでした。");
      if (helpSession !== helpSessionRef.current) return;
      setChatMessages((current) => [...current, { role: "assistant", content: result.answer }]);
    } catch {
      if (helpSession !== helpSessionRef.current) return;
      setChatMessages((current) => [...current, { role: "assistant", content: `${answerHelpQuestion(audience, trimmedQuestion)}（現在AIへ接続できないため、登録済みの操作案内から回答しています。）` }]);
    } finally {
      if (helpSession === helpSessionRef.current) setAsking(false);
    }
  };

  return (
    <>
      <button type="button" className={`help-center-trigger ${className}`.trim()} onClick={openHelp} aria-label={title} title={title}>
        <i className="fas fa-circle-question" aria-hidden="true" />{showLabel && <span>ヘルプ</span>}
      </button>
      {open && (
        <div className="help-center-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeHelp(); }}>
          <section ref={dialogRef} className="help-center-dialog" role="dialog" aria-modal="true" aria-labelledby={`help-center-title-${audience}`}>
            <header className="help-center-header">
              <div><p>el-town HELP</p><h2 id={`help-center-title-${audience}`}>{title}</h2></div>
              <button type="button" className="help-center-close" onClick={closeHelp} aria-label="ヘルプを閉じる"><i className="fas fa-xmark" /></button>
            </header>
            {audience === "admin" && (
              <Link href="/manual/admin" className="help-center-manual" onClick={closeHelp}>
                <i className="fas fa-book-open" /><span><strong>役員管理画面マニュアルを見る</strong><small>画像付きの手順を確認できます</small></span><i className="fas fa-chevron-right" />
              </Link>
            )}
            <div className="help-center-chat">
              <div className="help-center-bot-answer" aria-live="polite"><i className="fas fa-circle-info" /><p>{operationAnswer}</p></div>
              {audience === "member" ? (
                selectedCategory ? (
                  <div className="help-center-operation-level">
                    <button type="button" className="help-center-level-back" onClick={() => { setSelectedCategoryId(""); setOperationAnswer("知りたい操作のカテゴリを選んでください。"); }}><i className="fas fa-chevron-left" /> 操作カテゴリへ戻る</button>
                    <p className="help-center-section-label">{selectedCategory.label}</p>
                    <div className="help-center-operation-list" aria-label={`${selectedCategory.label}の操作`}>
                      {selectedCategory.operations.map((operation) => (
                        <button key={operation.label} type="button" onClick={() => setOperationAnswer(operation.answer)}>
                          <span><strong>{operation.label}</strong><small>{operation.description}</small></span><i className="fas fa-chevron-right" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="help-center-section-label">知りたい操作を選ぶ</p>
                    <div className="help-center-suggestions is-operation-grid" aria-label="知りたい操作を選ぶ">
                      {memberCategories.map((category) => (
                        <button key={category.id} type="button" onClick={() => { setSelectedCategoryId(category.id); setOperationAnswer(`「${category.label}」の中から、確認したい操作を選んでください。`); }}>
                          <i className={`fas ${category.icon}`} aria-hidden="true" /><span><strong>{category.label}</strong><small>{category.description}</small></span><i className="fas fa-chevron-right help-center-category-arrow" aria-hidden="true" />
                        </button>
                      ))}
                    </div>
                  </>
                )
              ) : (
                <><p className="help-center-section-label">よくある質問</p><div className="help-center-suggestions" aria-label="よくある質問">
                  {adminSuggestions.map((suggestion) => <button key={suggestion.label} type="button" onClick={() => setOperationAnswer(answerHelpQuestion("admin", suggestion.label))}><i className={`fas ${suggestion.icon}`} /><strong>{suggestion.label}</strong></button>)}
                </div></>
              )}
              <section className="help-center-ai" aria-labelledby={`help-ai-title-${audience}`}>
                <div className="help-center-ai-heading">
                  <div><i className="fas fa-comments" /><span><strong id={`help-ai-title-${audience}`}>AIチャットで質問</strong><small>続けて質問できます</small></span></div>
                  {chatMessages.length > 1 && <button type="button" onClick={() => setChatMessages(initialChat)}>会話をクリア</button>}
                </div>
                <div className="help-center-chat-log" ref={chatLogRef} aria-live="polite">
                  {chatMessages.map((message, index) => <div key={`${message.role}-${index}`} className={`help-center-chat-message ${message.role}`}><span>{message.role === "assistant" ? "AI" : "あなた"}</span><p>{message.content}</p></div>)}
                  {asking && <div className="help-center-chat-message assistant"><span>AI</span><p><i className="fas fa-spinner fa-spin" /> 回答を考えています…</p></div>}
                </div>
                <form className="help-center-form" onSubmit={handleSubmit}>
                  <label htmlFor={`help-question-${audience}`}>質問を入力</label><div>
                    <input id={`help-question-${audience}`} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="例：会費の領収書はどこですか？" maxLength={300} disabled={asking} />
                    <button type="submit" aria-label="質問を送る" disabled={asking || !question.trim()}><i className="fas fa-paper-plane" /></button>
                  </div>
                </form>
                <small className="help-center-note">個人情報やパスワードは入力しないでください。</small>
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
