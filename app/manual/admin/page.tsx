'use client';

import React from 'react';
import ManualViewer, { ManualStep } from '@/components/ManualViewer';

/* ============================================================
   役員管理画面 操作マニュアル
   ============================================================ */

/* ---------- 共通パーツ ---------- */
const AdminHeader = ({ title, showClose }: { title?: string; showClose?: boolean }) => (
  <div className="bg-[#4F95D3] text-white flex items-center justify-between px-4 py-2.5 shrink-0 shadow-sm">
    <div className="flex items-center gap-2">
      <span className="font-black text-xs opacity-80">el-town</span>
      {title && <span className="text-xs font-bold ml-1 opacity-90">| {title}</span>}
    </div>
    {showClose !== false && (
      <i className="fas fa-times text-sm opacity-80" />
    )}
  </div>
);

const SettingsTabs = ({ active }: { active: string }) => {
  const tabs = ['基本情報', '会員名簿', '会費管理', '管理者設定'];
  return (
    <div className="flex border-b bg-white">
      {tabs.map(t => (
        <div
          key={t}
          className={`flex-1 text-center py-2 text-[10px] font-bold transition-colors ${
            t === active
              ? 'text-[#4F95D3] border-b-2 border-[#4F95D3]'
              : 'text-gray-400'
          }`}
        >
          {t}
        </div>
      ))}
    </div>
  );
};

/* ---------- ステップ定義 ---------- */
const steps: ManualStep[] = [
  /* ── ステップ1: LINEから管理画面を開く ── */
  {
    title: '① LINEから管理画面を開く',
    description:
      'LINEのトーク画面下部のリッチメニューから「役員の方」ボタンをタップして管理画面を開きます。',
    content: (
      <div className="flex flex-col h-full bg-[#7494C0]">
        {/* LINEヘッダー */}
        <div className="bg-[#2C3E50] text-white flex items-center px-4 py-3 shrink-0">
          <i className="fas fa-chevron-left mr-3" />
          <div className="font-bold text-sm">el-town</div>
        </div>
        {/* トーク */}
        <div className="flex-1 p-4 flex flex-col justify-end">
          <div className="bg-white rounded-2xl rounded-tl-none p-3 max-w-[80%] text-sm text-gray-800 shadow-sm mb-4">
            管理画面からお知らせの配信や会費管理ができます。下のメニューから「役員の方」をタップしてください。
          </div>
        </div>
        {/* リッチメニュー */}
        <div className="bg-white shrink-0 pb-4">
          <div className="text-center py-1 text-xs text-gray-500 border-b">
            ▲ メニューを開く/閉じる
          </div>
          <div className="grid grid-cols-2 p-2 gap-2 h-28">
            <div className="bg-[#4F95D3] rounded-xl flex flex-col items-center justify-center text-white opacity-70">
              <i className="fas fa-user-check text-xl mb-1" />
              <span className="font-bold text-xs">会員の方</span>
            </div>
            <div className="bg-[#4F95D3] rounded-xl flex flex-col items-center justify-center text-white relative">
              <i className="fas fa-user-cog text-xl mb-1" />
              <span className="font-bold text-xs">役員の方</span>
              <div className="absolute right-2 bottom-0 text-4xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">
                👆
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  /* ── ステップ2: ダッシュボードの見方 ── */
  {
    title: '② ダッシュボードの見方',
    description:
      'ダッシュボードでは、回覧板の平均既読率・今月のプッシュ通知送信件数・会費の納入状況が一目で確認できます。',
    content: (
      <div className="flex flex-col h-full bg-gray-50">
        <AdminHeader title="ダッシュボード" />
        <div className="flex-1 p-3 overflow-y-auto">
          <h2 className="text-sm font-black text-gray-800 mb-3">
            <i className="fas fa-chart-line mr-1 text-[#4F95D3]" />
            ダッシュボード
          </h2>
          {/* 統計カード */}
          <div className="space-y-2">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-500 font-bold">平均既読率</div>
                  <div className="text-2xl font-black text-[#4F95D3]">
                    78.5<span className="text-sm">%</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center">
                  <i className="fas fa-eye text-[#4F95D3]" />
                </div>
              </div>
              <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#4F95D3] rounded-full" style={{ width: '78.5%' }} />
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-500 font-bold">今月のプッシュ送信数</div>
                  <div className="text-2xl font-black text-green-600">
                    12<span className="text-sm ml-1">件</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                  <i className="fas fa-bell text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-500 font-bold">会費納入率</div>
                  <div className="text-2xl font-black text-orange-500">
                    64.2<span className="text-sm">%</span>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                  <i className="fas fa-yen-sign text-orange-500" />
                </div>
              </div>
              <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-orange-400 rounded-full" style={{ width: '64.2%' }} />
              </div>
            </div>
          </div>
          {/* 最近の配信 */}
          <div className="mt-3">
            <div className="text-[10px] text-gray-500 font-bold mb-1">最近の配信</div>
            <div className="bg-white rounded-lg p-2 shadow-sm text-xs text-gray-600 space-y-1.5">
              <div className="flex justify-between">
                <span>5月のゴミ収集日について</span>
                <span className="text-gray-400">5/6</span>
              </div>
              <div className="flex justify-between">
                <span>清掃活動のお知らせ</span>
                <span className="text-gray-400">5/5</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  /* ── ステップ3: 回覧板・お知らせを作成する ── */
  {
    title: '③ 回覧板・お知らせを作成する',
    description:
      '画面右下の「＋新規作成」ボタンから、お知らせ・回覧板・イベントを作成できます。カテゴリを選び、タイトルと本文を入力して保存します。',
    content: (
      <div className="flex flex-col h-full bg-gray-50">
        <AdminHeader title="新規作成" />
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            {/* カテゴリ選択 */}
            <div className="mb-3">
              <label className="text-[10px] font-bold text-gray-500 mb-1 block">カテゴリ</label>
              <div className="flex gap-1.5">
                <div className="flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold bg-sky-100 text-sky-600 border-2 border-sky-400">
                  お知らせ
                </div>
                <div className="flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold bg-gray-50 text-gray-400 border border-gray-200">
                  回覧板
                </div>
                <div className="flex-1 text-center py-1.5 rounded-lg text-[10px] font-bold bg-gray-50 text-gray-400 border border-gray-200">
                  イベント
                </div>
              </div>
            </div>
            {/* タイトル */}
            <div className="mb-3">
              <label className="text-[10px] font-bold text-gray-500 mb-1 block">
                タイトル <span className="text-red-500">*</span>
              </label>
              <div className="w-full bg-gray-50 border rounded-lg p-2 text-xs text-gray-800 font-bold">
                5月のゴミ収集日について
              </div>
            </div>
            {/* 本文 */}
            <div className="mb-3">
              <label className="text-[10px] font-bold text-gray-500 mb-1 block">
                本文 <span className="text-red-500">*</span>
              </label>
              <div className="w-full bg-gray-50 border rounded-lg p-2 text-xs text-gray-600 h-16 leading-relaxed">
                5月のゴミ収集日は以下の通りとなります。カラス被害が増えて...
              </div>
            </div>
          </div>
        </div>
        {/* FAB */}
        <div className="absolute bottom-4 right-4 z-50">
          <div className="bg-[#4F95D3] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg text-lg font-black relative">
            ＋
            <div className="absolute -top-1 -right-1 text-4xl transform -rotate-12 animate-bounce drop-shadow-xl">
              👆
            </div>
          </div>
        </div>
      </div>
    ),
  },

  /* ── ステップ4: プッシュ通知を送信する ── */
  {
    title: '④ プッシュ通知を送信する',
    description:
      '作成時に「プッシュ通知ON」にすると、会員のLINEに直接通知が届きます。重要な連絡にはONにすることをおすすめします。',
    content: (
      <div className="flex flex-col h-full bg-gray-50">
        <AdminHeader title="新規作成" />
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
            {/* タイトルプレビュー */}
            <div className="mb-3">
              <label className="text-[10px] font-bold text-gray-500 mb-1 block">タイトル</label>
              <div className="w-full bg-gray-50 border rounded-lg p-2 text-xs text-gray-800 font-bold">
                5月のゴミ収集日について
              </div>
            </div>
            {/* 本文プレビュー */}
            <div className="mb-4">
              <label className="text-[10px] font-bold text-gray-500 mb-1 block">本文</label>
              <div className="w-full bg-gray-50 border rounded-lg p-2 text-xs text-gray-600 h-10 leading-relaxed">
                5月のゴミ収集日は以下の通り...
              </div>
            </div>
            {/* プッシュ通知トグル */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-gray-800">
                    <i className="fas fa-bell mr-1 text-[#4F95D3]" />
                    プッシュ通知
                  </div>
                  <div className="text-[9px] text-gray-500 mt-0.5">
                    会員のLINEに直接通知します
                  </div>
                </div>
                {/* トグル ON */}
                <div className="w-11 h-6 bg-[#4F95D3] rounded-full relative shadow-inner">
                  <div className="absolute right-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all" />
                </div>
              </div>
              <div className="mt-2 text-[9px] text-blue-600 font-bold bg-blue-100 rounded-lg p-1.5 text-center">
                ⓘ 重要な連絡にはONがおすすめです
              </div>
            </div>
            {/* 保存ボタン */}
            <div className="relative">
              <div className="w-full bg-[#4F95D3] text-white text-center py-3 rounded-xl font-bold shadow-md text-sm">
                <i className="fas fa-paper-plane mr-1" />
                保存して配信する
              </div>
              <div className="absolute right-6 -bottom-2 text-4xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">
                👆
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  /* ── ステップ5: イベントの出欠を確認する ── */
  {
    title: '⑤ イベントの出欠を確認する',
    description:
      'イベントの回覧板では、会員からの参加申込を一覧で確認できます。大人・子供の合計人数も自動で集計されます。',
    content: (
      <div className="flex flex-col h-full bg-gray-50">
        <AdminHeader title="参加申込者一覧" />
        <div className="flex-1 p-3 overflow-y-auto">
          {/* イベント情報 */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-2.5 mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[9px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded font-bold">
                イベント
              </span>
              <span className="text-xs font-bold text-gray-800">清掃活動のお知らせ</span>
            </div>
            <div className="text-[10px] text-gray-500 mt-1">
              <i className="fas fa-calendar-day mr-1" />
              2026年5月20日(水)
            </div>
          </div>
          {/* 集計 */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 bg-white rounded-lg p-2 text-center shadow-sm border">
              <div className="text-[9px] text-gray-500 font-bold">参加世帯</div>
              <div className="text-lg font-black text-[#4F95D3]">8</div>
            </div>
            <div className="flex-1 bg-white rounded-lg p-2 text-center shadow-sm border">
              <div className="text-[9px] text-gray-500 font-bold">大人</div>
              <div className="text-lg font-black text-green-600">12</div>
            </div>
            <div className="flex-1 bg-white rounded-lg p-2 text-center shadow-sm border">
              <div className="text-[9px] text-gray-500 font-bold">子供</div>
              <div className="text-lg font-black text-orange-500">5</div>
            </div>
          </div>
          {/* 参加者リスト */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-3 py-1.5 text-[9px] font-bold text-gray-500 flex">
              <span className="flex-1">氏名</span>
              <span className="w-10 text-center">大人</span>
              <span className="w-10 text-center">子供</span>
            </div>
            {[
              { name: '山田 太郎', adult: 2, child: 1 },
              { name: '佐藤 花子', adult: 1, child: 2 },
              { name: '田中 一郎', adult: 2, child: 0 },
              { name: '鈴木 美咲', adult: 1, child: 1 },
              { name: '高橋 健太', adult: 2, child: 0 },
              { name: '伊藤 由美', adult: 1, child: 1 },
              { name: '渡辺 誠', adult: 2, child: 0 },
              { name: '中村 あい', adult: 1, child: 0 },
            ].map((p, i) => (
              <div
                key={i}
                className={`px-3 py-2 flex items-center text-xs ${
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                } border-t border-gray-50`}
              >
                <span className="flex-1 font-bold text-gray-700">{p.name}</span>
                <span className="w-10 text-center text-gray-600">{p.adult}</span>
                <span className="w-10 text-center text-gray-600">{p.child}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  /* ── ステップ6: 会員名簿を管理する ── */
  {
    title: '⑥ 会員名簿を管理する',
    description:
      '「設定」→「会員名簿」タブで会員の名簿を管理できます。手動追加やCSVファイルでの一括登録が可能です。',
    content: (
      <div className="flex flex-col h-full bg-gray-50">
        <AdminHeader title="設定" />
        <SettingsTabs active="会員名簿" />
        <div className="flex-1 p-3 overflow-y-auto">
          {/* アクション */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 bg-[#4F95D3] text-white text-center py-2 rounded-lg text-[10px] font-bold shadow-sm">
              <i className="fas fa-plus mr-1" />
              手動追加
            </div>
            <div className="flex-1 bg-white text-[#4F95D3] border border-[#4F95D3] text-center py-2 rounded-lg text-[10px] font-bold">
              <i className="fas fa-file-csv mr-1" />
              CSV一括登録
            </div>
          </div>
          {/* 名簿テーブル */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-2 py-1.5 text-[8px] font-bold text-gray-500 flex gap-1">
              <span className="w-16">氏名</span>
              <span className="w-14">〒</span>
              <span className="flex-1">住所</span>
            </div>
            {[
              { name: '山田 太郎', zip: '123-4567', addr: '得留ｹ丘1-2-40' },
              { name: '佐藤 花子', zip: '123-4567', addr: '得留ｹ丘1-3-12' },
              { name: '田中 一郎', zip: '123-4568', addr: '得留ｹ丘2-5-8' },
              { name: '鈴木 美咲', zip: '123-4568', addr: '得留ｹ丘2-6-1' },
              { name: '高橋 健太', zip: '123-4569', addr: '得留ｹ丘3-1-15' },
              { name: '伊藤 由美', zip: '123-4569', addr: '得留ｹ丘3-2-22' },
              { name: '渡辺 誠', zip: '123-4570', addr: '得留ｹ丘4-4-3' },
            ].map((m, i) => (
              <div
                key={i}
                className={`px-2 py-1.5 flex items-center text-[10px] gap-1 ${
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                } border-t border-gray-50`}
              >
                <span className="w-16 font-bold text-gray-700 truncate">{m.name}</span>
                <span className="w-14 text-gray-500">{m.zip}</span>
                <span className="flex-1 text-gray-500 truncate">{m.addr}</span>
              </div>
            ))}
          </div>
          <div className="text-center mt-2 text-[9px] text-gray-400">全 42 世帯</div>
        </div>
      </div>
    ),
  },

  /* ── ステップ7: 会費の管理・集金状況を確認する ── */
  {
    title: '⑦ 会費の管理・集金状況を確認する',
    description:
      '「設定」→「会費管理」タブで各世帯の会費納入状況を確認・管理できます。オンライン決済は自動で「完納」に、現金の場合は手動でチェックを入れます。',
    content: (
      <div className="flex flex-col h-full bg-gray-50">
        <AdminHeader title="設定" />
        <SettingsTabs active="会費管理" />
        <div className="flex-1 p-3 overflow-y-auto">
          {/* 集計サマリー */}
          <div className="flex gap-2 mb-3">
            <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-2 text-center">
              <div className="text-[9px] text-green-600 font-bold">完納</div>
              <div className="text-base font-black text-green-600">27</div>
            </div>
            <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-2 text-center">
              <div className="text-[9px] text-red-500 font-bold">未納</div>
              <div className="text-base font-black text-red-500">15</div>
            </div>
            <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
              <div className="text-[9px] text-[#4F95D3] font-bold">納入率</div>
              <div className="text-base font-black text-[#4F95D3]">64.3%</div>
            </div>
          </div>
          {/* 会費リスト */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="bg-gray-50 px-2 py-1.5 text-[8px] font-bold text-gray-500 flex">
              <span className="w-16">氏名</span>
              <span className="w-12 text-right">請求額</span>
              <span className="w-12 text-right">納入額</span>
              <span className="flex-1 text-center">状態</span>
            </div>
            {[
              { name: '山田 太郎', bill: '¥6,000', paid: '¥6,000', status: '完納' },
              { name: '佐藤 花子', bill: '¥6,000', paid: '¥6,000', status: '完納' },
              { name: '田中 一郎', bill: '¥6,000', paid: '¥0', status: '未納' },
              { name: '鈴木 美咲', bill: '¥6,000', paid: '¥6,000', status: '完納' },
              { name: '高橋 健太', bill: '¥6,000', paid: '¥0', status: '未納' },
              { name: '伊藤 由美', bill: '¥6,000', paid: '¥6,000', status: '完納' },
              { name: '渡辺 誠', bill: '¥6,000', paid: '¥0', status: '未納' },
            ].map((m, i) => (
              <div
                key={i}
                className={`px-2 py-1.5 flex items-center text-[10px] ${
                  i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                } border-t border-gray-50`}
              >
                <span className="w-16 font-bold text-gray-700 truncate">{m.name}</span>
                <span className="w-12 text-right text-gray-600">{m.bill}</span>
                <span className="w-12 text-right text-gray-600">{m.paid}</span>
                <span className="flex-1 text-center">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                      m.status === '完納'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-500'
                    }`}
                  >
                    {m.status}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
  },

  /* ── ステップ8: 町内会の基本設定 ── */
  {
    title: '⑧ 町内会の基本設定',
    description:
      '「設定」→「基本情報」タブで町内会・自治会の基本情報（名称・郵便番号・世帯数・管理者情報）を確認・変更できます。',
    content: (
      <div className="flex flex-col h-full bg-gray-50">
        <AdminHeader title="設定" />
        <SettingsTabs active="基本情報" />
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 space-y-3">
            <div>
              <label className="text-[10px] font-bold text-gray-500 mb-1 block">
                町内会・自治会名
              </label>
              <div className="w-full bg-gray-50 border rounded-lg p-2 text-xs text-gray-800 font-bold">
                得留ｹ丘町内会
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 mb-1 block">郵便番号</label>
              <div className="w-full bg-gray-50 border rounded-lg p-2 text-xs text-gray-800 font-bold">
                〒123-4567
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 mb-1 block">
                登録世帯数
              </label>
              <div className="w-full bg-gray-50 border rounded-lg p-2 text-xs text-gray-800 font-bold">
                42 世帯
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-gray-500 mb-1 block">
                管理者名（代表）
              </label>
              <div className="w-full bg-gray-50 border rounded-lg p-2 text-xs text-gray-800 font-bold">
                得留 太郎
              </div>
            </div>
            <div className="pt-1">
              <div className="w-full bg-[#4F95D3] text-white text-center py-2.5 rounded-xl font-bold shadow-sm text-xs">
                <i className="fas fa-save mr-1" />
                変更を保存
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },

  /* ── ステップ9: 管理者（役員）を追加する ── */
  {
    title: '⑨ 管理者（役員）を追加する',
    description:
      '「設定」→「管理者設定」タブから、他の役員を管理者として追加できます。追加された役員も管理画面にアクセスできるようになります。',
    content: (
      <div className="flex flex-col h-full bg-gray-50">
        <AdminHeader title="設定" />
        <SettingsTabs active="管理者設定" />
        <div className="flex-1 p-3 overflow-y-auto">
          {/* 管理者一覧 */}
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-3">
            <div className="bg-gray-50 px-3 py-1.5 text-[9px] font-bold text-gray-500">
              現在の管理者
            </div>
            {[
              { name: '得留 太郎', role: '代表', icon: 'fa-crown', color: 'text-yellow-500' },
              { name: '佐藤 花子', role: '副会長', icon: 'fa-user-shield', color: 'text-[#4F95D3]' },
              { name: '田中 一郎', role: '会計', icon: 'fa-user-shield', color: 'text-[#4F95D3]' },
            ].map((a, i) => (
              <div
                key={i}
                className="px-3 py-2.5 flex items-center border-t border-gray-50"
              >
                <div className="w-8 h-8 rounded-full bg-[#4F95D3]/10 flex items-center justify-center mr-2">
                  <i className={`fas ${a.icon} text-sm ${a.color}`} />
                </div>
                <div className="flex-1">
                  <div className="text-xs font-bold text-gray-800">{a.name}</div>
                  <div className="text-[9px] text-gray-500">{a.role}</div>
                </div>
                {a.role !== '代表' && (
                  <i className="fas fa-ellipsis-v text-gray-400 text-xs" />
                )}
              </div>
            ))}
          </div>
          {/* 追加ボタン */}
          <div className="relative">
            <div className="w-full bg-[#4F95D3] text-white text-center py-3 rounded-xl font-bold shadow-md text-sm">
              <i className="fas fa-user-plus mr-1" />
              管理者を追加
            </div>
            <div className="absolute right-6 -bottom-2 text-4xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">
              👆
            </div>
          </div>
          <div className="text-[9px] text-gray-400 text-center mt-2">
            追加された管理者も管理画面にアクセスできます
          </div>
        </div>
      </div>
    ),
  },

  /* ── ステップ10: 管理画面の閉じ方 ── */
  {
    title: '⑩ 管理画面の閉じ方',
    description:
      '操作が終わったら、画面右上の「×」ボタンを押してLINEのトーク画面に戻ります。次回もリッチメニューの「役員の方」からいつでもアクセスできます。',
    content: (
      <div className="flex flex-col h-full bg-gray-50">
        {/* ヘッダー with 👆 on close button */}
        <div className="bg-[#4F95D3] text-white flex items-center justify-between px-4 py-2.5 shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="font-black text-xs opacity-80">el-town</span>
            <span className="text-xs font-bold ml-1 opacity-90">| ダッシュボード</span>
          </div>
          <div className="relative">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <i className="fas fa-times text-sm" />
            </div>
            <div className="absolute -right-1 -bottom-6 text-4xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">
              👆
            </div>
          </div>
        </div>
        {/* ダッシュボード (薄く) */}
        <div className="flex-1 p-3 opacity-40">
          <h2 className="text-sm font-black text-gray-800 mb-3">
            <i className="fas fa-chart-line mr-1 text-[#4F95D3]" />
            ダッシュボード
          </h2>
          <div className="space-y-2">
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="text-[10px] text-gray-500 font-bold">平均既読率</div>
              <div className="text-xl font-black text-[#4F95D3]">78.5%</div>
            </div>
            <div className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
              <div className="text-[10px] text-gray-500 font-bold">今月のプッシュ送信数</div>
              <div className="text-xl font-black text-green-600">12件</div>
            </div>
          </div>
        </div>
        {/* 戻り先のLINE画面プレビュー */}
        <div className="bg-[#7494C0] p-3 border-t-2 border-[#4F95D3]">
          <div className="flex items-center gap-2 mb-2">
            <i className="fab fa-line text-green-400 text-lg" />
            <span className="text-white text-xs font-bold">LINEトーク画面に戻ります</span>
          </div>
          <div className="bg-white/20 rounded-lg p-2 text-[10px] text-white/80 text-center">
            次回も「役員の方」からいつでもアクセスできます
          </div>
        </div>
      </div>
    ),
  },
];

/* ---------- ページ コンポーネント ---------- */
export default function AdminManualPage() {
  return (
    <ManualViewer
      title="役員管理画面 操作マニュアル"
      subtitle="管理画面の基本操作ガイド"
      steps={steps}
      accentColor="#4F95D3"
      icon="fa-user-cog"
    />
  );
}
