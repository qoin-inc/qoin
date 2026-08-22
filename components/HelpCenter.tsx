"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type HelpAudience = "member" | "portal" | "admin";
type ChatMessage = { role: "user" | "assistant"; content: string };
type HelpOperation = { label: string; description: string; answer: string };
type HelpCategory = { id: string; label: string; description: string; icon: string; operations: HelpOperation[] };

type HelpCenterProps = {
  audience: HelpAudience;
  showLabel?: boolean;
  className?: string;
};

const memberCategories: HelpCategory[] = [
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

const portalCategories: HelpCategory[] = [
  {
    id: "food", label: "食べ・映えel-town", description: "お店・グルメ・景色の情報", icon: "fa-camera-retro",
    operations: [
      { label: "投稿を見る", description: "地域のおすすめ情報を見る", answer: "画面下の「食べ・映えel-town」を押すと、お店・グルメ・景色などの投稿が表示されます。投稿内の町内会・自治会名を押すと、その地域を地図で確認できます。" },
      { label: "情報を発信する", description: "おすすめ情報を投稿", answer: "画面下の「食べ・映えel-town」を押し、右下の鉛筆ボタンを押します。「食べ・映えel-town」を選び、ニックネーム、お店・スポット名、アピール内容を入力して「発信する」を押してください。場所と写真は任意です。" },
    ],
  },
  {
    id: "sight", label: "伝えel-town", description: "町内会・自治会の活動情報", icon: "fa-bullhorn",
    operations: [
      { label: "活動情報を見る", description: "行事・活動の投稿を見る", answer: "画面下の「伝えel-town」を押すと、町内会・自治会の行事や活動に関する投稿が表示されます。投稿内の町内会・自治会名を押すと、その地域を地図で確認できます。" },
      { label: "活動情報を発信する", description: "行事・活動を投稿", answer: "画面下の「伝えel-town」を押し、右下の鉛筆ボタンを押します。「伝えel-town」を選び、ニックネーム、行事・活動のタイトル、アピール内容を入力して「発信する」を押してください。開催場所と写真は任意です。" },
    ],
  },
  {
    id: "map", label: "マイel-town", description: "地図・地域ごとの投稿", icon: "fa-map-marked-alt",
    operations: [
      { label: "地図から地域を探す", description: "町内会・自治会を選ぶ", answer: "画面下の「マイel-town」を押し、地図上の町内会・自治会を押してください。選んだ地域の投稿欄が開き、新しい投稿が下に表示されます。" },
      { label: "地域の投稿を開閉する", description: "投稿欄を広く見る・閉じる", answer: "地図で地域を選ぶと投稿欄が開きます。「閉じる」「開く」で投稿欄をたたんだり表示したりできます。右上の×を押すと地域の選択を終了します。" },
    ],
  },
  {
    id: "manage", label: "投稿の管理", description: "自分の投稿を編集・削除", icon: "fa-pen-to-square",
    operations: [
      { label: "投稿を編集する", description: "自分の投稿内容を変更", answer: "「食べ・映えel-town」または「伝えel-town」で自分の投稿を表示し、投稿右上の鉛筆ボタンを押します。内容を直して「更新する」を押してください。" },
      { label: "投稿を削除する", description: "自分の投稿を削除", answer: "「食べ・映えel-town」または「伝えel-town」で自分の投稿を表示し、投稿右上のごみ箱ボタンを押します。確認画面で削除を確定してください。削除した投稿は元に戻せません。" },
      { label: "下のメニューを開閉する", description: "表示範囲を広げる", answer: "画面下の「メニューを閉じる」を押すと、3つのメニューボタンが隠れて表示範囲が広がります。もう一度「メニューを開く」を押すと元に戻ります。" },
    ],
  },
];

const adminCategories: HelpCategory[] = [
  {
    id: "basic", label: "基本機能", description: "団体・会員・会費・役員・決済", icon: "fa-layer-group",
    operations: [
      { label: "基本情報", description: "団体情報を確認・変更", answer: "管理トップで「基本機能」→「基本情報」を押します。町内会・自治会名、決算月、世帯規模、郵便番号、代表者表示などを確認・変更し、保存してください。" },
      { label: "会員管理", description: "名簿・連携・退会状態", answer: "管理トップで「基本機能」→「会員管理」を押します。連携済み会員、未連携名簿、家族アカウント、退会状態を確認し、必要な会員情報を登録・修正してください。" },
      { label: "会費管理", description: "請求・入金・手集金", answer: "管理トップで「基本機能」→「会費管理」を押します。会費設定、年間請求額、納入額、支払い方法を確認できます。役員が現金を受け取った場合は、対象会員の手集金額を入力して保存してください。" },
      { label: "システム利用料", description: "利用料・配信数を確認", answer: "管理トップで「基本機能」→「システム利用料」を押します。月額世帯単価、無料プッシュ枠、超過配信数、請求額を確認してください。" },
      { label: "役員管理", description: "招待・再送・退任", answer: "管理トップで「基本機能」→「役員管理」を押します。候補者名とメールアドレスを入力して招待できます。招待中の役員には再送でき、在任中の役員は退任、退任済みの役員は復活できます。" },
      { label: "Stripe連携", description: "オンライン決済の受付設定", answer: "管理トップで「基本機能」→「Stripe連携」を押します。Stripe Connectの登録状態と決済受付状態を確認し、未完了の場合は画面の案内に従って設定してください。" },
    ],
  },
  {
    id: "publish", label: "発信機能", description: "回覧板・連絡・イベント・総会", icon: "fa-paper-plane",
    operations: [
      { label: "電子回覧板", description: "資料を添えて会員へ配信", answer: "管理トップで「発信機能」→「電子回覧板」を押します。表題、発信者、本文を入力し、必要に応じてPDFや画像を添付します。LINEにも通知する場合は通知欄を確認してから保存してください。" },
      { label: "連絡", description: "本文中心のお知らせを配信", answer: "管理トップで「発信機能」→「連絡」を押します。表題、発信者、本文を入力し、必要に応じて添付資料とLINE通知を設定して保存してください。" },
      { label: "イベント", description: "開催案内・参加人数を受付", answer: "管理トップで「発信機能」→「イベント」を押します。表題、開催日、開催時間、本文を入力して保存します。配信後は参加者の大人・子供の人数を発信一覧で確認できます。" },
      { label: "総会案内", description: "出欠・委任状を受付", answer: "管理トップで「発信機能」→「総会案内」を押します。総会日時、本文、委任状の文面を入力して保存します。配信後は出欠回答と委任状を発信一覧で確認できます。" },
      { label: "発信を編集・削除", description: "配信済み内容を管理", answer: "管理トップの発信一覧で対象のカードを探し、「編集」または「削除」を押します。編集後は保存し直してください。削除した内容は元に戻せないため、対象を確認してから実行してください。" },
    ],
  },
  {
    id: "live", label: "Live・施設予約", description: "Web会議・施設・予約承認", icon: "fa-video",
    operations: [
      { label: "Web会議", description: "Live開催案内を登録", answer: "管理トップで「Live・施設予約」→「Web会議」を押します。LINEまたはYouTubeを選び、表題、開催日、時間、開催URL、内容を入力して案内を登録してください。必要に応じてLINE通知も設定できます。" },
      { label: "施設登録", description: "予約対象施設と利用条件", answer: "管理トップで「Live・施設予約」→「施設予約」を押します。施設名、場所、規模、利用可能時間、利用できない曜日・日付を入力して施設を登録してください。" },
      { label: "予約承認", description: "予約を承認・否認", answer: "管理トップの「Live・施設予約」または総合ビューの施設予約管理を開きます。施設、状態、月、日で絞り込み、対象予約の「承認」「否認」「解除」を押してください。" },
      { label: "登録内容の変更", description: "Web会議・施設を編集", answer: "管理トップの一覧から対象のWeb会議または施設を探し、「編集」または「修正」を押します。内容を変更して更新してください。削除する場合は対象を十分に確認してください。" },
    ],
  },
  {
    id: "accounting", label: "総会会計", description: "科目・予算・決算・帳票", icon: "fa-chart-pie",
    operations: [
      { label: "科目管理", description: "収入・支出科目を設定", answer: "管理トップで「総会会計」→「科目管理」を押します。収入・支出の科目や補助科目を追加・編集し、表示順を設定してください。" },
      { label: "予算書作成", description: "年度予算を入力", answer: "管理トップで「総会会計」→「予算書作成」を押します。会計年度を選び、各科目の予算額と備考を入力して保存してください。" },
      { label: "決算書作成", description: "収入・支出実績を入力", answer: "管理トップで「総会会計」→「決算書作成」を押します。会計年度と対象期間を確認し、科目、日付、金額、内容を入力して保存してください。" },
      { label: "CSV・PDF・印刷", description: "会計帳票を出力", answer: "管理トップで「総会会計」を開き、年度と集計内容を確認します。「予算CSV」「決算CSV」「予算PDF/印刷」「決算PDF/印刷」から必要な形式を選んでください。" },
    ],
  },
];

function answerCourtesyMessage(question: string) {
  const normalized = question.trim().toLowerCase().replace(/[。．.!！?？\s]+$/g, "");
  if (/^(ありがとう|ありがとうございます|ありがとうございました|どうもありがとう|助かりました)$/.test(normalized)) {
    return "どういたしまして。また分からないことがあれば、いつでも質問してください。";
  }
  return "";
}

function answerHelpQuestion(audience: HelpAudience, question: string) {
  const courtesyAnswer = answerCourtesyMessage(question);
  if (courtesyAnswer) return courtesyAnswer;
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
  if (audience === "portal") {
    if (/編集|修正|変更/.test(normalized)) return "「食べ・映えel-town」または「伝えel-town」で自分の投稿を表示し、投稿右上の鉛筆ボタンを押します。内容を直して「更新する」を押してください。";
    if (/削除|消す/.test(normalized)) return "自分の投稿の右上にあるごみ箱ボタンを押し、確認画面で削除を確定してください。削除した投稿は元に戻せません。";
    if (/投稿|発信|写真|おすすめ|グルメ|景色/.test(normalized)) return "画面下の「食べ・映えel-town」または「伝えel-town」を押し、右下の鉛筆ボタンを押します。投稿の種類を選び、必須項目を入力して「発信する」を押してください。";
    if (/地図|地域|町内会|自治会|場所/.test(normalized)) return "画面下の「マイel-town」を押し、地図上の町内会・自治会を押してください。選んだ地域の投稿欄が開きます。";
    if (/メニュー|広く|閉じる|開く/.test(normalized)) return "画面下の「メニューを閉じる」を押すと表示範囲が広がります。「メニューを開く」を押すと3つのメニューボタンが戻ります。";
    return "このヘルプでは確認できないため、町内会・自治会の役員へお問い合わせください。";
  }
  if (/総会.*(会計|予算|決算|科目)|予算|決算|科目|csv|印刷/.test(normalized)) return "管理トップで「総会会計」を押します。科目管理、予算書作成、決算書作成、CSV・PDF出力から必要な操作を選んでください。";
  if (/総会|委任状|出欠/.test(normalized)) return "管理トップで「発信機能」→「総会案内」を押し、総会日時、本文、委任状文面を入力して保存します。配信後の出欠と委任状は発信一覧で確認できます。";
  if (/回覧|配信|お知らせ|連絡|イベント/.test(normalized)) return "管理トップで「発信機能」を押し、「電子回覧板」「連絡」「イベント」から配信種別を選んで作成してください。";
  if (/会員|名簿|世帯|退会/.test(normalized)) return "管理トップで「基本機能」→「会員管理」を押すと、会員名簿、LINE連携、家族アカウント、退会状態を確認・管理できます。";
  if (/システム利用料|プッシュ|超過/.test(normalized)) return "管理トップで「基本機能」→「システム利用料」を押すと、月額世帯単価、無料プッシュ枠、超過配信数、請求額を確認できます。";
  if (/会費|支払|入金|手集金/.test(normalized)) return "管理トップで「基本機能」→「会費管理」を押すと、会費設定、請求額、入金状況、手集金を管理できます。";
  if (/stripe|決済|paypay/.test(normalized)) return "管理トップで「基本機能」→「Stripe連携」を押し、Connect登録と決済受付状態を確認してください。";
  if (/役員|招待|管理者/.test(normalized)) return "管理トップで「基本機能」→「役員管理」を押すと、役員の招待、再送、退任、復活を行えます。";
  if (/live|ライブ|web会議|ウェブ会議/.test(normalized)) return "管理トップで「Live・施設予約」→「Web会議」を押し、開催種別、表題、日時、URL、内容を入力して登録してください。";
  if (/施設|予約|承認|否認/.test(normalized)) return "管理トップで「Live・施設予約」→「施設予約」を押します。施設の登録・変更と、会員からの予約の承認・否認を行えます。";
  if (/基本情報|団体情報|決算月|郵便番号/.test(normalized)) return "管理トップで「基本機能」→「基本情報」を押し、団体名、決算月、世帯規模、郵便番号、代表者表示を確認・変更してください。";
  return "このヘルプでは確認できないため、操作マニュアルを確認してください。";
}

const initialChat: ChatMessage[] = [];
const initialOperationAnswer = "知りたい操作を選んでください。";

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
  const operationCategories = audience === "portal" ? portalCategories : audience === "admin" ? adminCategories : memberCategories;
  const selectedCategory = operationCategories.find((category) => category.id === selectedCategoryId);
  const title = audience === "member" ? "会員の方のヘルプ" : audience === "portal" ? "マイel-townのヘルプ" : "役員の方のヘルプ";
  const isAiChatActive = chatMessages.length > 0 || asking;

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
          <section ref={dialogRef} className={`help-center-dialog${isAiChatActive ? " is-ai-chat-active" : ""}`} role="dialog" aria-modal="true" aria-labelledby={`help-center-title-${audience}`}>
            <header className="help-center-header">
              <div><p>el-town HELP</p><h2 id={`help-center-title-${audience}`}>{title}</h2></div>
              {audience === "admin" && (
                <button type="button" className="help-center-return" onClick={closeHelp}>
                  <i className="fas fa-arrow-left" aria-hidden="true" />
                  管理画面へ戻る
                </button>
              )}
              <button type="button" className="help-center-close" onClick={closeHelp} aria-label="ヘルプを閉じる"><i className="fas fa-xmark" /></button>
            </header>
            {audience === "admin" && !isAiChatActive && (
              <Link href="/manual/admin" className="help-center-manual" onClick={closeHelp}>
                <i className="fas fa-book-open" /><span><strong>役員管理画面マニュアルを見る</strong><small>画像付きの手順を確認できます</small></span><i className="fas fa-chevron-right" />
              </Link>
            )}
            <div className={`help-center-chat${isAiChatActive ? " is-ai-chat-active" : ""}`}>
              {!isAiChatActive && audience !== "admin" && (
                <>
                  <div className="help-center-bot-answer" aria-live="polite"><i className="fas fa-circle-info" /><p>{operationAnswer}</p></div>
                  {selectedCategory ? (
                    <div className="help-center-operation-level">
                      <button type="button" className="help-center-level-back" onClick={() => { setSelectedCategoryId(""); setOperationAnswer(initialOperationAnswer); }}><i className="fas fa-chevron-left" /> 操作カテゴリへ戻る</button>
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
                        {operationCategories.map((category) => (
                          <button key={category.id} type="button" onClick={() => { setSelectedCategoryId(category.id); setOperationAnswer(`「${category.label}」の中から、確認したい操作を選んでください。`); }}>
                            <i className={`fas ${category.icon}`} aria-hidden="true" /><span><strong>{category.label}</strong><small>{category.description}</small></span><i className="fas fa-chevron-right help-center-category-arrow" aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
              <section className="help-center-ai" aria-labelledby={`help-ai-title-${audience}`}>
                <div className="help-center-ai-heading">
                  <div><i className="fas fa-comments" /><span><strong id={`help-ai-title-${audience}`}>AIチャットで質問</strong><small>続けて質問できます</small></span></div>
                  {isAiChatActive && <button type="button" onClick={resetHelpState}>操作メニューへ戻る</button>}
                </div>
                {(chatMessages.length > 0 || asking) && (
                  <div className="help-center-chat-log" ref={chatLogRef} aria-live="polite">
                    {chatMessages.map((message, index) => <div key={`${message.role}-${index}`} className={`help-center-chat-message ${message.role}`}><span>{message.role === "assistant" ? "AI" : "あなた"}</span><p>{message.content}</p></div>)}
                    {asking && <div className="help-center-chat-message assistant"><span>AI</span><p><i className="fas fa-spinner fa-spin" /> 回答を考えています…</p></div>}
                  </div>
                )}
                <form className="help-center-form" onSubmit={handleSubmit}>
                  <label htmlFor={`help-question-${audience}`}>質問を入力</label><div>
                    <textarea id={`help-question-${audience}`} value={question} onChange={(event) => setQuestion(event.target.value)} placeholder={audience === "portal" ? "例：おすすめ情報はどう投稿しますか？" : audience === "admin" ? "例：電子回覧板はどう配信しますか？" : "例：会費の領収書はどこですか？"} rows={3} maxLength={300} disabled={asking} />
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
