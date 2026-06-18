'use client';

import React from 'react';
import ManualViewer, { ManualStep } from '@/components/ManualViewer';

/* ─────────────────── CSSキーフレーム & アニメーションスタイルの定義 ─────────────────── */
const animationStyle = `
  @keyframes pulseSlow {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.85; transform: scale(0.98); }
  }
  @keyframes pulseAlert {
    0%, 100% { background-color: rgba(220, 38, 38, 0.1); border-color: rgba(220, 38, 38, 0.4); }
    50% { background-color: rgba(220, 38, 38, 0.25); border-color: rgba(220, 38, 38, 0.9); }
  }
  @keyframes typingUrl {
    from { width: 0; }
    to { width: 100%; }
  }
  @keyframes copyToast {
    0%, 100% { opacity: 0; transform: translateY(12px) translateX(-50%); }
    20%, 80% { opacity: 1; transform: translateY(0) translateX(-50%); }
  }
  @keyframes cursorClick {
    0%, 100% { transform: scale(1); background-color: rgba(255,255,255,0); }
    50% { transform: scale(1.2); background-color: rgba(255,255,255,0.25); }
  }
  .animate-pulse-slow { animation: pulseSlow 2s infinite ease-in-out; }
  .animate-pulse-alert { animation: pulseAlert 1.5s infinite ease-in-out; }
  .animate-copy-toast { animation: copyToast 3s infinite ease-in-out; }
  .animate-cursor-click { animation: cursorClick 2s infinite ease-in-out; }
`;

/* ─────────────────── ステップ1: 概要 ─────────────────── */
function Step1Content() {
  return (
    <div className="h-full bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 flex flex-col p-8 overflow-y-auto text-white">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-600 rounded-3xl shadow-2xl mb-4 text-white">
          <i className="fas fa-video text-4xl"></i>
        </div>
        <h2 className="font-black text-2xl md:text-3xl leading-snug tracking-wide text-white">
          Live・施設予約管理とは
        </h2>
        <div className="text-indigo-300 text-sm md:text-base font-bold mt-2">会議・配信・施設予約の統合システム</div>
      </div>

      <div className="space-y-5 flex-1 max-w-2xl mx-auto w-full">
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-left shadow-xl hover:bg-white/10 transition">
          <h3 className="font-black text-lg md:text-xl flex items-center gap-3 text-indigo-300">
            <i className="fas fa-users text-indigo-400"></i> オンライン集会（LINE/YouTube）
          </h3>
          <p className="text-sm text-slate-300 font-bold mt-2.5 leading-relaxed">
            LINEミーティングやYouTube配信URLをカレンダーへ直接スケジュール登録可能。会員はスマホ画面からワンタップで参加できます。
          </p>
        </div>
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-left shadow-xl hover:bg-white/10 transition">
          <h3 className="font-black text-lg md:text-xl flex items-center gap-3 text-indigo-300">
            <i className="fas fa-building text-indigo-400"></i> 施設予約管理（集会所等）
          </h3>
          <p className="text-sm text-slate-300 font-bold mt-2.5 leading-relaxed">
            リアル施設を時間帯（30分単位）で仮予約可能。管理者は管理画面から確認・承認でき、時間帯の重複申請は自動ブロックされます。
          </p>
        </div>
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 text-left shadow-xl hover:bg-white/10 transition">
          <h3 className="font-black text-lg md:text-xl flex items-center gap-3 text-indigo-300">
            <i className="fas fa-bell text-indigo-400"></i> プッシュ通知連携
          </h3>
          <p className="text-sm text-slate-300 font-bold mt-2.5 leading-relaxed">
            Liveイベント登録時の全会員への一斉告知や、施設予約承認時の個別プッシュ通知をLINE公式アカウントへ自動配信します。<br />
            (プッシュ通知の件数にカウントされますので、必要なければプッシュ通知のチェックを外してください）
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ2: YouTube チャンネル開設 ─────────────────── */
function Step2Content() {
  return (
    <div className="h-full bg-slate-50 flex flex-col items-center justify-center p-8 text-slate-800 text-center font-sans">
      {/* YouTube風ダークテーマモックアップ */}
      <div className="w-full max-w-[500px] flex flex-col justify-between p-6 bg-[#0f0f0f] text-white rounded-3xl border border-zinc-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <i className="fab fa-youtube text-red-600 text-3xl animate-pulse-slow"></i>
            <span className="font-black tracking-tighter text-xl">YouTube</span>
          </div>
          <div className="bg-zinc-800 text-zinc-200 px-4 py-1.5 rounded-full text-xs md:text-sm font-black border border-zinc-700">ログイン済</div>
        </div>
        <div className="bg-[#1f1f1f] p-8 rounded-2xl border border-zinc-800 text-center space-y-6 relative">
          <div className="w-20 h-20 rounded-full bg-zinc-700 flex items-center justify-center mx-auto text-zinc-400 border-2 border-zinc-600 text-4xl">
            <i className="fas fa-user-circle"></i>
          </div>
          <div className="space-y-2">
            <p className="font-black text-white text-base md:text-lg">マイチャンネルの作成</p>
            <p className="text-xs md:text-sm text-zinc-400 leading-normal font-bold">ライブ配信にはチャンネルの開設が必要です</p>
          </div>
          <div className="bg-[#3ea6ff] hover:bg-[#65b8ff] text-black font-black px-8 py-3 rounded-full text-sm shadow-md animate-pulse-slow inline-block cursor-pointer transition">
            チャンネルを作成
          </div>
        </div>
      </div>
      <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl px-6 py-4 w-full max-w-[500px] text-left shadow-sm space-y-3">
        <p className="text-xs md:text-sm text-blue-900 font-bold leading-relaxed">
          💡 **パソコンの場合**: YouTubeにログイン後、画面右上にある丸い「プロフィールアイコン」をクリックし、メニューから「チャンネルを作成」を選んで開設してください。
        </p>
        <p className="text-xs md:text-sm text-blue-900 font-bold leading-relaxed border-t border-blue-200 pt-2">
          💡 **スマートフォンの場合**: YouTubeアプリを開き、画面右下（または右上）の「マイページ（プロフィール）」をタップし、お名前の下にある「チャンネルを作成」をタップして開設してください。
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ3: YouTube 24時間待機警告 ─────────────────── */
function Step3Content() {
  return (
    <div className="h-full bg-slate-50 flex flex-col items-center justify-center p-8 text-slate-800 text-center font-sans">
      {/* YouTube風ダークテーマモックアップ */}
      <div className="w-full max-w-[500px] flex flex-col justify-between p-6 bg-[#0f0f0f] text-white rounded-3xl border border-zinc-800 shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2.5">
            <i className="fas fa-video text-red-500 text-2xl"></i>
            <span className="font-black text-base md:text-lg text-zinc-200">YouTube Studio ライブ管理</span>
          </div>
        </div>
        <div className="bg-red-950/40 p-8 rounded-2xl border-2 border-red-500/50 flex flex-col items-center justify-center text-center space-y-5 animate-pulse-alert">
          <div className="w-16 h-16 rounded-full bg-red-900/60 text-red-400 flex items-center justify-center shrink-0 border border-red-500 shadow-lg text-3xl">
            <i className="fas fa-exclamation-triangle"></i>
          </div>
          <div className="space-y-2">
            <p className="font-black text-red-400 text-lg md:text-xl">【重要】配信機能の有効化待ち</p>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed font-bold">本人確認（SMS認証）後、実際に配信が可能になるまで<br /><span className="text-amber-400 font-black underline decoration-2">最大24時間の待機時間</span>が必要です。</p>
          </div>
          <div className="flex items-center gap-3 bg-zinc-900 px-5 py-3 rounded-xl border border-zinc-800 text-amber-400 font-mono text-sm md:text-base font-bold shadow-md">
            <i className="fas fa-hourglass-half animate-spin"></i>
            <span>有効化まで 23:59:59</span>
          </div>
        </div>
      </div>
      <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-2xl px-6 py-4 w-full max-w-[500px] text-left shadow-sm">
        <p className="text-xs md:text-sm text-red-800 font-bold leading-relaxed">
          ⚠️ 初めてライブ配信機能を使う場合、有効化に最大24時間かかります。総会などの直前の準備では配信枠を作れません。必ず**前日以前**に申請を完了させてください。
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ4: YouTube 配信スケジュール ─────────────────── */
function Step4Content() {
  return (
    <div className="h-full bg-slate-50 flex flex-col items-center justify-center p-8 text-slate-800 text-center font-sans">
      {/* YouTube風ダークテーマモックアップ */}
      <div className="w-full max-w-[500px] flex flex-col justify-between p-6 bg-[#0f0f0f] text-white rounded-3xl border border-zinc-800 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <span className="font-black text-base md:text-lg text-zinc-200">新規配信のスケジュール</span>
          <span className="bg-red-600 text-white px-4 py-1.5 rounded-xl text-xs md:text-sm font-black shadow-md">Studio</span>
        </div>
        <div className="bg-[#1f1f1f] p-5 rounded-2xl border border-zinc-800 space-y-5 text-left">
          <div className="space-y-2">
            <div className="text-xs md:text-sm text-zinc-400 font-black">タイトル</div>
            <div className="bg-[#0f0f0f] border border-zinc-700 px-4 py-3 rounded-xl text-white text-sm md:text-base font-black shadow-inner">
              令和8年度 定期総会・配信
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl shadow-md space-y-2.5">
            <div className="text-xs md:text-sm text-indigo-400 font-black flex items-center justify-between">
              <span>公開設定</span>
              <span className="bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded text-[10px] font-black">推奨</span>
            </div>
            <div className="flex items-center gap-2.5 text-white font-black">
              <i className="fas fa-lock text-[#3ea6ff] text-base"></i>
              <span className="text-sm md:text-base">限定公開 (Unlisted)</span>
            </div>
            <p className="text-xs md:text-sm text-zinc-400 leading-relaxed font-bold">
              リンクを知っている人（町内会員）だけが視聴できます。一般全体には非公開のため安心・安全です。
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl px-6 py-4 w-full max-w-[500px] text-left shadow-sm space-y-3">
        <p className="text-xs md:text-sm text-blue-900 font-bold leading-relaxed">
          💡 **パソコンの場合**: YouTube Studioの画面右上にある「作成」ボタン（ビデオカメラに＋のマーク） ➔ 「ライブ配信を開始」を開き、配信スケジュールを設定します。
        </p>
        <p className="text-xs md:text-sm text-blue-900 font-bold leading-relaxed border-t border-blue-200 pt-2">
          💡 **スマートフォンの場合**: YouTubeアプリを開き、画面下部中央の **「＋」ボタン** ➔ **「ライブ配信を開始」** をタップし、画面右上にある **「スケジュール（カレンダー）」アイコン** をタップして配信スケジュールを設定してください。（※プライバシー公開設定は必ず「限定公開」にしてください）
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ5: YouTube URLコピー & 貼り付け ─────────────────── */
function Step5Content() {
  return (
    <div className="h-full bg-slate-50 flex flex-col items-center justify-center p-8 text-slate-800 text-center font-sans">
      {/* YouTube風ダークテーマモックアップ */}
      <div className="w-full max-w-[500px] flex flex-col justify-between p-6 bg-[#0f0f0f] text-white rounded-3xl border border-zinc-800 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <span className="font-black text-base md:text-lg text-zinc-200">共有リンクのコピー</span>
        </div>
        <div className="bg-[#1f1f1f] p-5 rounded-2xl border border-zinc-800 flex-1 flex flex-col justify-between text-left relative space-y-5">
          <div className="space-y-2">
            <div className="text-xs md:text-sm text-zinc-400 font-black">共有用リンク</div>
            <div className="bg-[#0f0f0f] border border-zinc-700 px-4 py-3.5 rounded-xl flex items-center justify-between font-mono text-xs md:text-sm text-[#3ea6ff] overflow-hidden relative shadow-inner">
              <span className="truncate font-bold pr-2">https://youtu.be/aBcDeFgHiJk</span>
              <div className="bg-[#3ea6ff] hover:bg-[#65b8ff] text-black p-2 rounded-full cursor-pointer shrink-0 ml-1 animate-cursor-click shadow-md flex items-center justify-center w-10 h-10 transition">
                <i className="fas fa-copy text-sm md:text-base"></i>
              </div>
            </div>
          </div>
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-xl text-xs md:text-sm font-black animate-copy-toast whitespace-nowrap z-20">
            <i className="fas fa-check-circle mr-1"></i> コピーしました！
          </div>
          <div className="border-t border-zinc-850 pt-5 flex items-center justify-between gap-3">
            <span className="text-xs md:text-sm text-zinc-400 font-black shrink-0">本画面に入力 ➡</span>
            <div className="bg-white border-2 border-indigo-400 px-4 py-3.5 rounded-xl text-xs md:text-sm text-indigo-750 font-black overflow-hidden flex-1 shadow-inner h-11 flex items-center">
              <span className="inline-block overflow-hidden border-r-2 border-indigo-400 whitespace-nowrap pr-0.5 max-w-full font-black" style={{ animation: 'typingUrl 2.5s steps(20, end) infinite' }}>
                https://youtu.be/aBcDeFgHiJk
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl px-6 py-4 w-full max-w-[500px] text-left shadow-sm">
        <p className="text-xs md:text-sm text-blue-900 font-bold leading-relaxed">
          💡 配信枠の「共有」ボタン等から共有URLをコピーし、イベントスケジュール登録画面の「会議・配信参加用URL」入力欄に貼り付け（ペースト）してください。
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ6: LINE ミーティング作成 ─────────────────── */
function Step6Content() {
  return (
    <div className="h-full bg-[#b2c7da] flex flex-col items-center justify-center p-8 text-slate-800 text-center font-sans">
      <div className="w-full max-w-[500px] flex flex-col justify-between p-6 bg-white rounded-3xl border-2 border-slate-300 shadow-2xl space-y-6 overflow-hidden">
        <div className="flex items-center justify-between bg-[#4e6a8d] px-5 py-4 -mx-6 -mt-6 border-b-2 border-[#3d5572] rounded-t-3xl">
          <div className="flex items-center gap-2 text-white">
            <span className="w-8 h-8 rounded-full bg-[#06C755] flex items-center justify-center text-sm text-white font-black">L</span>
            <span className="font-black text-base md:text-lg">LINEミーティング作成</span>
          </div>
        </div>
        <div className="p-6 flex-1 flex flex-col justify-center items-center text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-[#06C755] text-white flex items-center justify-center shadow-lg relative cursor-pointer animate-cursor-click border-2 border-green-400 text-3xl">
            <i className="fas fa-video"></i>
          </div>
          <div>
            <p className="font-black text-slate-800 text-base md:text-lg">ミーティングを作成</p>
            <p className="text-xs md:text-sm text-slate-500 mt-2.5 leading-relaxed font-bold">トーク画面やメニューの「カメラ（ミーティング）」<br />マークをタップします</p>
          </div>
        </div>
      </div>
      <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-2xl px-6 py-4 w-full max-w-[500px] text-left shadow-sm space-y-3">
        <p className="text-xs md:text-sm text-green-950 font-black flex items-center gap-1.5">
          💡 ビデオカメラ（ミーティング）マークの場所
        </p>
        <div className="text-xs md:text-sm text-green-900 font-bold leading-relaxed space-y-2.5">
          <div>
            <span className="underline decoration-green-400 decoration-2 font-black text-green-950">スマホ版LINEの場合:</span><br />
            トーク一覧画面の右上にある **「吹き出しに＋」マーク** ➔ メニュー内の **「ミーティング（ビデオカメラマーク）」** をタップします。（※画面上部に直接ビデオカメラマークがある場合もあります）
          </div>
          <div className="border-t border-green-200 pt-2">
            <span className="underline decoration-green-400 decoration-2 font-black text-green-950">PC版LINEの場合:</span><br />
            左側の「トーク」アイコンをクリックし、トーク一覧の上部（検索窓の右側）にある **「ビデオカメラ」マーク** をクリックします。
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ7: LINE コピー ─────────────────── */
function Step7Content() {
  return (
    <div className="h-full bg-[#b2c7da] flex flex-col items-center justify-center p-8 text-slate-800 text-center font-sans">
      <div className="w-full max-w-[500px] flex flex-col justify-between p-6 bg-white rounded-3xl border-2 border-slate-300 shadow-2xl space-y-6 overflow-hidden">
        <div className="flex items-center justify-between bg-[#4e6a8d] px-5 py-4 -mx-6 -mt-6 border-b-2 border-[#3d5572] rounded-t-3xl">
          <span className="font-black text-base md:text-lg text-white">ミーティング管理</span>
        </div>
        <div className="p-6 flex-1 flex flex-col justify-between text-center relative space-y-6">
          <div className="bg-slate-50 p-5 rounded-2xl border-2 border-slate-200 text-left space-y-1">
            <div className="font-black text-sm md:text-base text-slate-800">定期意見交換会・LINE</div>
            <div className="text-xs md:text-sm text-slate-500 font-mono font-bold">https://line.me/R/meeting/abc123xyz</div>
          </div>
          <div className="w-full bg-[#06C755] hover:bg-[#05a848] text-white font-black py-4 rounded-2xl shadow-md relative flex items-center justify-center gap-2 animate-cursor-click cursor-pointer text-sm md:text-base transition">
            <i className="fas fa-copy"></i>
            <span>リンクをコピー</span>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl shadow-xl text-xs md:text-sm font-black animate-copy-toast whitespace-nowrap z-20">
            <i className="fas fa-check-circle mr-1"></i> コピーしました！
          </div>
        </div>
      </div>
      <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-2xl px-6 py-4 w-full max-w-[500px] text-left shadow-sm">
        <p className="text-xs md:text-sm text-green-950 font-bold leading-relaxed">
          💡 表示されたミーティング情報画面の **「リンクをコピー」** ボタンをタップし、招待URLをクリップボードへコピーします。
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ8: LINE 貼り付け ─────────────────── */
function Step8Content() {
  return (
    <div className="h-full bg-[#b2c7da] flex flex-col items-center justify-center p-8 text-slate-800 text-center font-sans">
      <div className="w-full max-w-[500px] flex flex-col justify-between p-6 bg-white rounded-3xl border-2 border-slate-300 shadow-2xl space-y-6 overflow-hidden">
        <div className="flex items-center justify-between bg-[#4e6a8d] px-5 py-4 -mx-6 -mt-6 border-b-2 border-[#3d5572] rounded-t-3xl">
          <span className="font-black text-base md:text-lg text-white">本画面の入力欄</span>
        </div>
        <div className="p-6 flex-1 flex flex-col justify-center items-center text-center space-y-5">
          <div className="w-full bg-white border-2 border-indigo-400 px-4 py-3.5 rounded-xl text-xs md:text-sm text-indigo-750 font-black overflow-hidden text-left relative h-12 flex items-center shadow-inner">
            <span className="inline-block overflow-hidden border-r-2 border-indigo-400 whitespace-nowrap pr-0.5 max-w-full font-black" style={{ animation: 'typingUrl 2.5s steps(20, end) infinite' }}>
              https://line.me/R/meeting/abc123xyz
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-emerald-600 font-black text-sm md:text-base">
            <i className="fas fa-check-circle text-xl"></i>
            <span>貼り付け完了！スケジュールを登録</span>
          </div>
        </div>
      </div>
      <div className="mt-6 bg-green-50 border-2 border-green-200 rounded-2xl px-6 py-4 w-full max-w-[500px] text-left shadow-sm">
        <p className="text-xs md:text-sm text-green-950 font-bold leading-relaxed">
          💡 コピーした招待URLを、本システムイベント登録画面の「会議・配信参加用URL」入力欄に貼り付け、イベント登録ボタンを押して完了です。
        </p>
      </div>
    </div>
  );
}

/* ─────────────────── メインページ ─────────────────── */
const steps: ManualStep[] = [
  {
    title: '① Live・施設予約管理とは',
    description:
      'オンライン会議（LINEミーティング）やライブ配信（YouTube）の登録手順、および集会所などのリアル施設予約を統合管理するシステムです。カレンダーによる予約申請と、LINE通知連携の全体の仕組みをご案内します。',
    content: <Step1Content />,
  },
  {
    title: '② YouTube: アカウント＆チャンネル作成',
    description:
      'ライブ配信スケジュール枠を作成するためには、Googleアカウントでのログインと、配信用のYouTubeマイチャンネルの開設が必要です。',
    content: <Step2Content />,
  },
  {
    title: '③ YouTube: 配信機能の有効化（24時間待機）',
    description:
      '【重要】初めてライブ配信を行う場合、本人確認（SMS認証）完了後、機能が有効化されるまでに最大24時間かかります。必ず前日以前に申請を完了させてください。',
    content: <Step3Content />,
  },
  {
    title: '④ YouTube: 配信スケジュールの作成',
    description:
      'YouTube Studioで総会やイベントの配信をスケジュール登録します。公開設定は必ず「限定公開」に設定し、会員のみがアクセスできる安全な状態で配信しましょう。',
    content: <Step4Content />,
  },
  {
    title: '⑤ YouTube: URLコピー & 貼り付け',
    description:
      '作成した配信の動画共有URLをコピーし、el-townシステム上のイベント登録フォームに貼り付けて保存・告知します。',
    content: <Step5Content />,
  },
  {
    title: '⑥ LINE: トーク画面からミーティング作成',
    description:
      'LINEアプリ（スマホまたはPC版）のビデオ/カメラアイコン等から「ミーティングを作成」ボタンをタップして開始します。',
    content: <Step6Content />,
  },
  {
    title: '⑦ LINE: ミーティング招待リンクのコピー',
    description:
      'ミーティング作成完了画面で「リンクをコピー」ボタンをタップし、招待URLを取得します。',
    content: <Step7Content />,
  },
  {
    title: '⑧ LINE: URLの貼り付けと設定完了',
    description:
      'コピーしたLINEミーティングのURLを、本システムの入力欄へ貼り付けてスケジュールを登録します。カレンダー経由で会員スマホへ通知が連携されます。',
    content: <Step8Content />,
  },
];

export default function LiveManualPage() {
  return (
    <>
      <style>{animationStyle}</style>
      <ManualViewer
        title="Live・施設予約管理マニュアル"
        subtitle="オンライン会議・配信URLの設定"
        steps={steps}
        accentColor="#4F46E5"
        icon="fa-video"
      />
    </>
  );
}
