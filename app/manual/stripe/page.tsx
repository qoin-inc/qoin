'use client';

import React from 'react';
import ManualViewer, { ManualStep } from '@/components/ManualViewer';

/* ─────────────────── ステップ1：el-townがStripeを標準採用する理由 ─────────────────── */
function Step1Content() {
  const reasons = [
    {
      num: '1',
      icon: 'fa-yen-sign',
      title: '初期費用0円',
      desc: '年会費決済時のみ手数料3.6%',
      note: '※口座送金時 手数料240円/回 (2026/5現在)',
      color: '#635BFF',
    },
    {
      num: '2',
      icon: 'fa-shield-alt',
      title: 'セキュリティ万全',
      desc: 'PCI DSS Level1 準拠',
      note: '3Dセキュア・不正検知AI・TLS暗号化',
      color: '#0A2540',
    },
    {
      num: '3',
      icon: 'fa-globe',
      title: '世界500万社以上が採用',
      desc: 'Amazon・Google・TOYOTA等が利用',
      note: '日本でも多数の企業が導入済み',
      color: '#00D4AA',
    },
    {
      num: '4',
      icon: 'fa-exchange-alt',
      title: '現金とのハイブリッド対応',
      desc: 'キャッシュレス＋現金をel-townで一括管理',
      note: '',
      color: '#FF6B35',
    },
  ];

  return (
    <div className="h-full bg-gradient-to-br from-[#635BFF] via-[#7A73FF] to-[#0A2540] flex flex-col p-5 overflow-y-auto">
      {/* メインタイトル */}
      <div className="text-center mb-5">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-lg mb-3">
          <i className="fab fa-stripe-s text-[#635BFF] text-3xl"></i>
        </div>
        <h2 className="text-white font-black text-lg md:text-xl leading-tight">
          el-townがStripeを<br />標準採用する理由
        </h2>
        <div className="text-white/60 text-xs font-bold mt-1">世界最高水準のオンライン決済</div>
      </div>

      {/* 1〜4の理由 */}
      <div className="space-y-2.5 flex-1">
        {reasons.map((r, i) => (
          <div
            key={i}
            className="bg-white rounded-xl p-3.5 shadow-lg flex items-start gap-3"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ backgroundColor: r.color }}
            >
              <span className="text-white font-black text-sm">{r.num}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-gray-800 text-sm md:text-base">{r.title}</div>
              <div className="text-sm text-gray-600 font-bold mt-0.5">{r.desc}</div>
              {r.note && <div className="text-xs text-gray-400 font-bold mt-0.5">{r.note}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────── ステップ2：テスト連携を開始する ─────────────────── */
function Step2Content() {
  return (
    <div className="h-full bg-[#f0f2f5] flex flex-col">
      {/* 管理画面ヘッダー */}
      <div className="bg-[#2C3E50] text-white flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm opacity-80">el-town</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-bold">管理画面</span>
        </div>
        <i className="fas fa-bars text-base"></i>
      </div>

      {/* タブ */}
      <div className="bg-white border-b flex shrink-0">
        <div className="px-4 py-3 text-sm font-bold text-gray-400 border-b-2 border-transparent">基本情報</div>
        <div className="px-4 py-3 text-sm font-bold text-gray-400 border-b-2 border-transparent">通知設定</div>
        <div className="px-4 py-3 text-sm font-black text-[#635BFF] border-b-2 border-[#635BFF]">オンライン集金</div>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-3">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[#635BFF]/10 rounded-lg flex items-center justify-center">
              <i className="fab fa-stripe-s text-[#635BFF] text-xl"></i>
            </div>
            <div>
              <div className="font-black text-base text-gray-800">Stripe決済連携</div>
              <div className="text-sm text-gray-400 font-bold">オンラインで会費を集金</div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <i className="fas fa-info-circle text-yellow-500 text-sm mt-0.5"></i>
              <p className="text-sm text-yellow-700 font-bold leading-relaxed">
                まずはテストモードで連携を開始します。テスト用のカード情報で動作確認ができます。
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              <span className="text-sm text-gray-500 font-bold">Stripe未連携</span>
            </div>
          </div>

          <div className="relative">
            <button className="w-full bg-[#635BFF] text-white font-black py-3.5 rounded-xl text-base shadow-md hover:bg-[#524AE8] transition flex items-center justify-center gap-2">
              <i className="fab fa-stripe-s"></i>
              Stripeアカウントを登録・連携する
            </button>
            <div className="absolute right-4 -bottom-2 text-5xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">👆</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ3：Stripe登録画面の入力ポイント ─────────────────── */
function Step3Content() {
  const fields = [
    { label: '事業形態', value: '個人事業主 / 非営利団体', highlight: true, note: 'いずれかを選択' },
    { label: '法人番号', value: '（空欄でOK）', highlight: false, note: 'スキップ可能' },
    { label: '代表者の氏名', value: '得留　太郎', highlight: true, note: '本人確認書類と一致' },
    { label: '代表者の住所', value: '東京都○○区...', highlight: true, note: '本人確認書類と一致' },
    { label: '銀行口座情報', value: '○○銀行 普通 1234567', highlight: true, note: '入金先口座' },
  ];

  return (
    <div className="h-full bg-white flex flex-col">
      {/* Stripe風ヘッダー */}
      <div className="bg-[#0A2540] text-white flex items-center px-4 py-3 shrink-0">
        <i className="fab fa-stripe text-3xl mr-2"></i>
        <span className="font-bold text-base">アカウント登録</span>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <i className="fas fa-lightbulb text-blue-500 text-sm mt-0.5"></i>
            <p className="text-sm text-blue-700 font-bold leading-relaxed">
              入力のポイントを確認しましょう
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {fields.map((f, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 border ${f.highlight ? 'border-[#635BFF]/30 bg-[#635BFF]/5' : 'border-gray-200 bg-gray-50'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-black text-gray-700">{f.label}</label>
                {f.highlight && (
                  <span className="text-xs bg-[#635BFF] text-white px-2 py-0.5 rounded font-bold">重要</span>
                )}
              </div>
              <div className="bg-white border rounded px-3 py-2 text-sm text-gray-600 font-bold">
                {f.value}
              </div>
              <div className="text-xs text-gray-400 font-bold mt-1 flex items-center gap-1">
                <i className="fas fa-arrow-right text-xs"></i>{f.note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ4：テスト連携の完了 ─────────────────── */
function Step4Content() {
  return (
    <div className="h-full bg-[#f0f2f5] flex flex-col">
      {/* 管理画面ヘッダー */}
      <div className="bg-[#2C3E50] text-white flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm opacity-80">el-town</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-bold">管理画面</span>
        </div>
        <i className="fas fa-bars text-base"></i>
      </div>

      {/* タブ */}
      <div className="bg-white border-b flex shrink-0">
        <div className="px-4 py-3 text-sm font-bold text-gray-400 border-b-2 border-transparent">基本情報</div>
        <div className="px-4 py-3 text-sm font-bold text-gray-400 border-b-2 border-transparent">通知設定</div>
        <div className="px-4 py-3 text-sm font-black text-[#635BFF] border-b-2 border-[#635BFF]">オンライン集金</div>
      </div>

      <div className="flex-1 p-5 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-check-circle text-4xl text-green-500"></i>
          </div>
          <h3 className="font-black text-gray-800 text-lg mb-1">Stripe連携が完了しています</h3>
          <p className="text-sm text-gray-500 font-bold mb-4">テストモードで動作中</p>

          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500 font-bold">アカウントID</span>
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded font-bold">テスト</span>
            </div>
            <div className="text-sm font-mono text-gray-700 font-bold">acct_1Abc2DefGhIjKlMn</div>
          </div>

          <div className="flex items-center gap-2 justify-center">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
            <span className="text-sm text-green-600 font-bold">接続中</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ5：テスト決済で動作確認 ─────────────────── */
function Step5Content() {
  return (
    <div className="h-full bg-gradient-to-b from-[#f0f2f5] to-[#e8eaed] flex flex-col items-center justify-center p-5">
      {/* スマホフレーム */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 w-full max-w-[340px] overflow-hidden">
        {/* スマホ支払い画面ヘッダー */}
        <div className="bg-[#635BFF] text-white px-4 py-3 flex items-center gap-2">
          <i className="fas fa-lock text-sm"></i>
          <span className="text-sm font-bold">会費のお支払い</span>
        </div>

        <div className="p-5">
          <div className="text-center mb-5">
            <div className="text-sm text-gray-500 font-bold">お支払い金額</div>
            <div className="text-3xl font-black text-gray-800">¥3,000</div>
            <div className="text-sm text-gray-400 font-bold">2026年度 年会費</div>
          </div>

          <div className="space-y-3 mb-5">
            <div>
              <label className="text-sm font-bold text-gray-600 mb-1 block">カード番号</label>
              <div className="bg-gray-50 border rounded-lg px-3 py-2.5 flex items-center justify-between">
                <span className="text-sm font-mono font-bold text-gray-800">4242 4242 4242 4242</span>
                <i className="fab fa-cc-visa text-blue-600 text-lg"></i>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-600 mb-1 block">有効期限</label>
                <div className="bg-gray-50 border rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-gray-800">12/29</div>
              </div>
              <div className="flex-1">
                <label className="text-sm font-bold text-gray-600 mb-1 block">CVC</label>
                <div className="bg-gray-50 border rounded-lg px-3 py-2.5 text-sm font-mono font-bold text-gray-800">123</div>
              </div>
            </div>
          </div>

          <div className="bg-[#635BFF] text-white font-black py-3 rounded-lg text-center text-base shadow-md">
            テスト決済する
          </div>
        </div>
      </div>

      <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2.5 w-full">
        <div className="flex items-center gap-2">
          <i className="fas fa-flask text-yellow-500 text-sm"></i>
          <p className="text-sm text-yellow-700 font-bold">テスト用カード情報 ─ 実際のお金は動きません</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ6：本番への切替 ─────────────────── */
function Step6Content() {
  return (
    <div className="h-full bg-[#f0f2f5] flex flex-col">
      {/* 管理画面ヘッダー */}
      <div className="bg-[#2C3E50] text-white flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm opacity-80">el-town</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-bold">管理画面</span>
        </div>
        <i className="fas fa-bars text-base"></i>
      </div>
      <div className="bg-white border-b flex shrink-0">
        <div className="px-4 py-3 text-sm font-bold text-gray-400 border-b-2 border-transparent">基本情報</div>
        <div className="px-4 py-3 text-sm font-bold text-gray-400 border-b-2 border-transparent">通知設定</div>
        <div className="px-4 py-3 text-sm font-black text-[#635BFF] border-b-2 border-[#635BFF]">オンライン集金</div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 mb-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <i className="fas fa-check-circle text-green-500 text-xl"></i>
            </div>
            <div>
              <div className="font-black text-base text-gray-800">Stripe連携済み</div>
              <div className="text-sm text-yellow-600 font-bold"><i className="fas fa-flask mr-1"></i>テスト環境</div>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="text-sm text-green-700 font-bold mb-1">✅ テスト確認が完了したら</div>
            <p className="text-sm text-green-600 font-bold leading-relaxed">「本番環境へ切り替える」ボタンを押して、本番用の登録に進みます。</p>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-blue-100">
          <div className="flex items-center gap-2 mb-2">
            <i className="fas fa-rocket text-blue-500 text-sm"></i>
            <span className="text-sm font-black text-blue-600">本番環境への切替</span>
          </div>
          <p className="text-sm text-gray-500 font-bold mb-3 leading-relaxed">テスト用アカウントが解除され、本番用アカウントの登録画面が表示されます。</p>
          <div className="relative">
            <button className="w-full bg-blue-600 text-white font-black py-3.5 rounded-xl text-base shadow-md flex items-center justify-center gap-2">
              <i className="fas fa-rocket"></i>本番環境へ切り替える
            </button>
            <div className="absolute right-4 -bottom-2 text-5xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">👆</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ7：本番アカウントの登録 ─────────────────── */
function Step7Content() {
  return (
    <div className="h-full bg-[#f0f2f5] flex flex-col">
      <div className="bg-[#2C3E50] text-white flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm opacity-80">el-town</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-bold">管理画面</span>
        </div>
        <i className="fas fa-bars text-base"></i>
      </div>
      <div className="bg-white border-b p-5">
        <div className="bg-[#635BFF]/5 border border-[#635BFF]/20 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <i className="fas fa-rocket text-[#635BFF] text-sm"></i>
            <span className="text-sm font-black text-[#635BFF]">本番用アカウントを登録</span>
          </div>
          <p className="text-sm text-gray-600 font-bold leading-relaxed">今度は本番用の登録画面が開きます</p>
        </div>
        <div className="relative">
          <button className="w-full bg-[#635BFF] text-white font-black py-3.5 rounded-xl text-base shadow-md flex items-center justify-center gap-2">
            <i className="fab fa-stripe-s"></i>Stripeアカウントを登録・連携する
          </button>
          <div className="absolute right-4 -bottom-2 text-5xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">👆</div>
        </div>
      </div>
      <div className="flex-1 p-5 overflow-y-auto">
        <div className="text-sm font-black text-gray-700 mb-3 flex items-center gap-1"><i className="fas fa-clipboard-check text-[#635BFF]"></i>本番登録で必要なもの</div>
        <div className="space-y-3">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center shrink-0"><i className="fas fa-id-card text-blue-500 text-base"></i></div>
            <div><div className="text-sm font-black text-gray-800">本人確認書類</div><div className="text-xs text-gray-400 font-bold">運転免許証・マイナンバーカード等</div></div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center shrink-0"><i className="fas fa-university text-green-500 text-base"></i></div>
            <div><div className="text-sm font-black text-gray-800">実際の銀行口座情報</div><div className="text-xs text-gray-400 font-bold">売上入金先の口座</div></div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center shrink-0"><i className="fas fa-file-upload text-purple-500 text-base"></i></div>
            <div><div className="text-sm font-black text-gray-800">書類のアップロード</div><div className="text-xs text-gray-400 font-bold">スマホで撮影してアップロード</div></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ8：本番連携の完了＆審査 ─────────────────── */
function Step8Content() {
  return (
    <div className="h-full bg-[#f0f2f5] flex flex-col">
      <div className="bg-[#2C3E50] text-white flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm opacity-80">el-town</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-bold">管理画面</span>
        </div>
        <i className="fas fa-bars text-base"></i>
      </div>
      <div className="bg-white border-b flex shrink-0">
        <div className="px-4 py-3 text-sm font-bold text-gray-400 border-b-2 border-transparent">基本情報</div>
        <div className="px-4 py-3 text-sm font-bold text-gray-400 border-b-2 border-transparent">通知設定</div>
        <div className="px-4 py-3 text-sm font-black text-[#635BFF] border-b-2 border-[#635BFF]">オンライン集金</div>
      </div>
      <div className="flex-1 p-5 flex flex-col items-center justify-center">
        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100 w-full">
          <div className="text-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3"><i className="fas fa-check-circle text-3xl text-green-500"></i></div>
            <h3 className="font-black text-gray-800 text-base mb-0.5">Stripe連携が完了しています</h3>
            <p className="text-sm text-gray-500 font-bold">本番モードで接続中</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-500 font-bold">アカウントID</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold">本番</span>
            </div>
            <div className="text-sm font-mono text-gray-700 font-bold">acct_1ReaL2ProdAcCtId</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center"><i className="fas fa-hourglass-half text-orange-500 text-sm animate-pulse"></i></div>
              <div><div className="text-sm font-black text-orange-700">アカウント審査中</div><div className="text-xs text-orange-500 font-bold">Stripeによる自動審査</div></div>
            </div>
            <div className="bg-white rounded-lg p-2.5 flex items-center gap-2">
              <i className="fas fa-clock text-orange-400 text-sm"></i>
              <span className="text-sm font-bold text-gray-700">審査は通常 <span className="text-orange-600 font-black">1〜2営業日</span> で完了</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-2"><div className="w-5 h-5 rounded-full bg-green-400 flex items-center justify-center"><i className="fas fa-check text-white text-xs"></i></div><span className="text-sm font-bold text-green-600">本番アカウント登録完了</span></div>
            <div className="ml-2.5 border-l-2 border-dashed border-gray-200 h-4"></div>
            <div className="flex items-center gap-2 mb-2"><div className="w-5 h-5 rounded-full bg-orange-400 flex items-center justify-center animate-pulse"><i className="fas fa-spinner text-white text-xs"></i></div><span className="text-sm font-bold text-orange-600">審査中...</span></div>
            <div className="ml-2.5 border-l-2 border-dashed border-gray-200 h-4"></div>
            <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center"><i className="fas fa-flag text-gray-400 text-xs"></i></div><span className="text-sm font-bold text-gray-400">決済・入金が可能に</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ9：役員側の会費請求操作 ─────────────────── */
function Step9Content() {
  return (
    <div className="h-full bg-[#f0f2f5] flex flex-col">
      <div className="bg-[#2C3E50] text-white flex items-center justify-between px-4 py-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-black text-sm opacity-80">el-town</span>
          <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-bold">管理画面</span>
        </div>
        <i className="fas fa-bars text-base"></i>
      </div>
      <div className="bg-white border-b flex shrink-0">
        <div className="px-4 py-3 text-sm font-bold text-gray-400 border-b-2 border-transparent">基本情報</div>
        <div className="px-4 py-3 text-sm font-black text-indigo-600 border-b-2 border-indigo-600">会費管理</div>
        <div className="px-4 py-3 text-sm font-bold text-gray-400 border-b-2 border-transparent">オンライン集金</div>
      </div>
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            <i className="fas fa-info-circle text-blue-500 text-sm mt-0.5"></i>
            <p className="text-sm text-blue-700 font-bold leading-relaxed">審査完了後、「会費管理」タブから会員への請求を行います。</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden mb-3">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-black text-gray-700"><i className="fas fa-yen-sign mr-1 text-indigo-500"></i>会費一覧</span>
            <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded font-bold">2026年度</span>
          </div>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-xs text-gray-500 font-bold"><th className="p-2.5 text-left">会員名</th><th className="p-2.5 text-right">請求額</th><th className="p-2.5 text-center">ステータス</th></tr></thead>
            <tbody>
              <tr className="border-t border-gray-50"><td className="p-2.5 font-bold text-gray-800">田中 太郎</td><td className="p-2.5 text-right font-mono text-gray-800">3,000円</td><td className="p-2.5 text-center"><span className="bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded text-xs font-bold"><i className="fas fa-check-circle mr-0.5"></i>完納</span></td></tr>
              <tr className="border-t border-gray-50"><td className="p-2.5 font-bold text-gray-800">佐藤 花子</td><td className="p-2.5 text-right font-mono text-gray-800">3,000円</td><td className="p-2.5 text-center"><span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-xs font-bold"><i className="fas fa-exclamation-circle mr-0.5"></i>未納</span></td></tr>
              <tr className="border-t border-gray-50"><td className="p-2.5 font-bold text-gray-800">鈴木 一郎</td><td className="p-2.5 text-right font-mono text-gray-800">3,000円</td><td className="p-2.5 text-center"><span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-xs font-bold"><i className="fas fa-exclamation-circle mr-0.5"></i>未納</span></td></tr>
            </tbody>
          </table>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-2"><i className="fas fa-paper-plane text-indigo-500 text-sm"></i><span className="text-sm font-black text-gray-700">会費請求を送信</span></div>
          <p className="text-xs text-gray-500 font-bold mb-3 leading-relaxed">未納の会員にLINEで会費請求通知が届きます。会員はスマホから簡単に支払いが可能です。</p>
          <button className="w-full bg-indigo-600 text-white font-black py-3 rounded-xl text-sm shadow-md flex items-center justify-center gap-2"><i className="fas fa-paper-plane"></i>未納者に請求を一括送信する</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── ステップ10：会員側の支払い画面 ─────────────────── */
function Step10Content() {
  return (
    <div className="h-full bg-gradient-to-b from-[#7494C0] to-[#5a7ba5] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 w-full max-w-[340px] overflow-hidden">
        <div className="bg-[#7494C0] text-white px-4 py-2.5 text-center">
          <span className="font-black text-sm">○○町内会</span>
          <span className="text-blue-100 font-bold text-xs ml-1">電子掲示板</span>
        </div>
        <div className="p-5">
          <h3 className="font-bold text-gray-800 text-base mb-4 border-b border-gray-100 pb-2"><i className="fas fa-yen-sign mr-2 text-blue-500"></i>町内会費のお支払い</h3>
          <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 text-center">
            <div className="w-14 h-14 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-3 border border-orange-200"><i className="fas fa-file-invoice-dollar"></i></div>
            <h4 className="text-orange-800 text-base font-black mb-1">会費のお願い</h4>
            <p className="text-orange-600 text-xs font-bold mb-4">今年度の町内会費の納入をお願いいたします。</p>
            <div className="bg-white p-3 rounded-xl border border-orange-100 mb-4 shadow-inner">
              <div className="flex justify-between items-center border-b border-gray-100 pb-2 mb-2">
                <span className="text-gray-500 text-xs font-bold">請求金額</span>
                <span className="text-gray-800 font-black text-xl">¥3,000</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs font-bold">支払期限</span>
                <span className="text-gray-700 text-sm font-bold">指定なし</span>
              </div>
            </div>
            <div className="relative">
              <button className="w-full bg-blue-600 text-white font-black py-3.5 rounded-xl shadow-lg flex items-center justify-center"><i className="fas fa-credit-card mr-2 text-lg"></i> オンラインで支払う</button>
              <div className="absolute right-3 -bottom-2 text-4xl transform -rotate-12 animate-bounce drop-shadow-xl z-50">👆</div>
            </div>
            <div className="mt-2.5 flex items-center justify-center text-[10px] text-gray-500"><i className="fas fa-lock mr-1"></i> Stripeによる安全な決済</div>
          </div>
        </div>
        <div className="bg-gray-100 border-t border-gray-200 p-2">
          <div className="flex bg-white rounded-lg overflow-hidden shadow-sm text-xs font-bold">
            <div className="flex-1 py-2 text-center text-gray-400">回覧版</div>
            <div className="flex-1 py-2 text-center text-pink-500 bg-pink-50 border-b-2 border-pink-500">会費</div>
            <div className="flex-1 py-2 text-center text-gray-400">設定</div>
          </div>
        </div>
      </div>
      <div className="mt-3 bg-white/90 border border-white/50 rounded-lg px-4 py-2.5 w-full max-w-[340px]">
        <div className="flex items-center gap-2">
          <i className="fas fa-mobile-alt text-[#7494C0] text-sm"></i>
          <p className="text-sm text-gray-700 font-bold">会員のスマホにはこの画面が表示されます</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── メインページ ─────────────────── */
const steps: ManualStep[] = [
  {
    title: '① el-townがStripeを標準採用する理由',
    description:
      '初期費用0円・決済時のみ手数料3.6%、世界最高水準のセキュリティ（PCI DSS準拠）、世界500万社以上の採用実績、そして現金とのハイブリッド管理。el-townがStripeを標準装備する4つの理由をご紹介します。',
    content: <Step1Content />,
  },
  {
    title: '② テスト連携を開始する',
    description:
      '管理画面の「設定」→「オンライン集金」タブから「Stripeアカウントを登録・連携する」ボタンを押します。最初はテストモードで安全に動作確認ができます。',
    content: <Step2Content />,
  },
  {
    title: '③ Stripe登録画面の入力ポイント',
    description:
      '事業形態は「個人事業主」か「非営利団体」を選択。法人番号は空欄でスキップOK。代表者の氏名・住所は本人確認書類と一致させてください。',
    content: <Step3Content />,
  },
  {
    title: '④ テスト連携の完了',
    description:
      '登録画面での手続きが終わると、管理画面に戻ります。「Stripe連携が完了しています」と表示されれば成功です。',
    content: <Step4Content />,
  },
  {
    title: '⑤ 本番への切替',
    description:
      'テスト連携が確認できたら「本番環境へ切り替える」ボタンを押します。テスト用アカウントが解除され、本番用の登録が可能になります。',
    content: <Step6Content />,
  },
  {
    title: '⑥ 本番アカウントの登録',
    description:
      'もう一度「連携する」ボタンを押すと、今度は本番用のStripe登録画面が開きます。実際の本人確認書類と銀行口座情報を入力してください。',
    content: <Step7Content />,
  },
  {
    title: '⑦ 本番連携の完了＆審査',
    description:
      '本番アカウントの登録後、Stripeによるアカウント審査が自動開始されます。審査は通常1〜2営業日で完了し、完了後に実際の会費決済・入金が可能になります。',
    content: <Step8Content />,
  },
  {
    title: '⑧ 会費の請求（役員の操作）',
    description:
      '審査完了後、管理画面の「会費管理」タブから会員への請求を送信します。未納の会員にLINEで請求通知が届き、スマホから簡単に支払いが可能になります。',
    content: <Step9Content />,
  },
  {
    title: '⑨ 会員のお支払い画面',
    description:
      '会員のスマホには「会費のお支払い」画面が表示されます。「オンラインで支払う」ボタンを押すとStripeの安全な決済画面が開き、クレジットカードで支払いが完了します。',
    content: <Step10Content />,
  },
];

export default function StripeManualPage() {
  return (
    <ManualViewer
      title="Stripe連携 操作マニュアル"
      subtitle="テスト接続から本番登録まで"
      steps={steps}
      accentColor="#635BFF"
      icon="fa-credit-card"
    />
  );
}

