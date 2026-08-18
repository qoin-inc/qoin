'use client';

import React from 'react';
import { ManualAccessGate } from '../_components/ManualAccess';
import { ManualSiteHeader } from '../_components/ManualSiteHeader';

type GuideSection = {
  id: string;
  number: string;
  title: string;
  summary: string;
  image: string;
  imageAlt: string;
  steps: string[];
  checks: string[];
  caution?: string;
};

const sections: GuideSection[] = [
  {
    id: 'basic-info', number: '01', title: '基本情報',
    summary: '町内会・自治会名、決算月、世帯規模、郵便番号を設定します。',
    image: '/manual/screens/admin-basic/02-basic-info.png', imageAlt: '役員管理画面の基本情報設定',
    steps: [
      '管理トップで「基本機能」を押し、「基本情報」の「開く」を押します。',
      '名称、決算月、会員世帯数、郵便番号を確認・入力します。',
      '内容を確認して「保存して反映」を押します。',
    ],
    checks: [
      '決算月の翌月から次年度として扱われます。',
      '決算月は予算書・決算書と会費管理の対象期間に使われます。',
      '代表者情報は現在登録されている内容を確認できます。',
    ],
    caution: '決算月を変更すると年度の区切り方に影響します。会費請求や総会会計を始める前に設定してください。',
  },
  {
    id: 'members', number: '02', title: '会員管理',
    summary: '名簿登録、CSV入出力、LINE連携、家族アカウント、退会状態を管理します。',
    image: '/manual/screens/admin-basic/03-member-management.png', imageAlt: '役員管理画面の会員管理',
    steps: [
      '「基本機能」→「会員管理」を押します。',
      '少人数なら画面へ氏名・カタカナ・住所・家族情報を入力し、「会員を登録」を押します。',
      '多数の名簿は「CSV取込み」、バックアップや確認には「CSV出力」を使います。',
      '会員一覧で連携状態を確認し、修正する場合は対象者の「編集」を押します。',
    ],
    checks: [
      '会員の初回LINE連携では、登録した氏名・カタカナ・住所情報を照合します。',
      '本人または家族がLINE連携した世帯がシステム利用料の対象になります。',
      '「名簿登録」「料金対象アカウント」「未連携／対象外」を画面右側で確認できます。',
    ],
    caution: '退会承認を行うと、その世帯のLINE連携が解除されます。退会済み状態は通常操作では元に戻せないため、対象者を必ず確認してください。',
  },
  {
    id: 'fees', number: '03', title: '会費管理',
    summary: '団体別の会費、請求額、手集金、Stripe入金、未納状況を年度ごとに管理します。',
    image: '/manual/screens/admin-basic/04-fee-management.png', imageAlt: '役員管理画面の会費管理',
    steps: [
      '「基本機能」→「会費管理」を押します。',
      '会費名称、標準会費額、年度開始月、会員向け支払い案内を設定します。',
      '手集金・Stripeカード決済・口座振込から、団体で利用する受取方法を選んで保存します。',
      '会計年度、請求額、対象者を選び「請求額を設定」を押します。',
      '会費一覧で請求額、手集金、Stripe入金、未入金額を確認します。',
    ],
    checks: [
      '全会員世帯への一括設定と、名簿で選んだ会員だけへの設定を使い分けられます。',
      '現金受領は「手集金を修正」から役員が入力します。',
      'Stripe入金は決済完了後に自動反映され、手集金とは別に集計されます。',
      '退会済み会員の過去の会費記録も年度集計に残ります。',
    ],
    caution: '団体別の会費設定を保存しても、すでに作成済みの請求・入金実績は自動変更されません。請求作成前に金額と年度を確認してください。',
  },
  {
    id: 'system-fee', number: '04', title: 'システム利用料',
    summary: '接続数、プッシュ件数、月別請求、支払い方法、領収書を確認します。',
    image: '/manual/screens/admin-basic/05-system-fee.png', imageAlt: '役員管理画面のシステム利用料',
    steps: [
      '「基本機能」→「システム利用料」を押します。',
      'クレジットカード自動決済またはStripe銀行振込を選択します。',
      '当月の接続数、プッシュ件数、超過件数、税込請求見込みを確認します。',
      '月別請求一覧で請求日、金額、入金状態を確認し、入金後に領収書を出力します。',
    ],
    checks: [
      '料金対象の接続数は、会員管理で本人または家族がLINE連携した世帯数です。',
      '無料プッシュ枠を超えた件数に超過単価が適用されます。',
      'カード自動決済は初回登録後、原則として毎月1日に処理されます。',
      'Stripe銀行振込では団体専用の振込先が請求書へ表示されます。',
    ],
    caution: '支払い方法が「未選択」の場合は自動決済されません。運用開始前に団体で利用する方法を決めてください。',
  },
  {
    id: 'admins', number: '05', title: '役員管理',
    summary: '役員の招待、メール再送、在任・招待中・退任済みの状態を管理します。',
    image: '/manual/screens/admin-basic/06-admin-management.png', imageAlt: '役員管理画面の役員管理',
    steps: [
      '「基本機能」→「役員管理」を押します。',
      '候補者名、メールアドレス、役職を入力し「招待メールを送信」を押します。',
      '招待中の役員がメールを確認し、専用URLから登録を完了します。',
      '役員一覧のタブで「在任中」「招待中」「退任済み」を切り替えて状態を確認します。',
    ],
    checks: [
      '招待URLの有効期限は発行から7日間です。',
      '期限切れやメール未着の場合は招待メールを再送できます。',
      '別の町内会・自治会で登録済みのメールアドレスも招待できます。',
      '登録済み役員は共通のパスワードで複数団体を切り替えられます。',
    ],
    caution: '最後の管理者は退任できません。先に別の役員を招待し、登録完了を確認してから役割を変更してください。',
  },
  {
    id: 'stripe', number: '06', title: 'Stripe連携',
    summary: '会費のオンライン決済に必要なConnect登録、本人確認、入金先口座、受付状態を管理します。',
    image: '/manual/screens/admin-basic/07-stripe-connect.png', imageAlt: '役員管理画面のStripe連携',
    steps: [
      '「基本機能」→「Stripe連携」を押します。',
      '団体区分、団体名、連絡先メール、電話番号、Webサイト、サービス内容を確認・入力します。',
      '代表者の本人確認書類と、団体が管理する入金先口座を準備します。',
      '確認欄へチェックを入れ、「本番Stripe登録を開始」を押してStripeの画面で登録を完了します。',
      '管理画面へ戻り「Stripe状態を更新」を押し、決済受付と入金／振込が有効か確認します。',
    ],
    checks: [
      '契約主体は町内会・自治会とStripeで、el-townは連携システムを提供します。',
      '代表者情報、本人確認書類、銀行口座はStripeの安全な画面で入力します。',
      '会費管理でStripeカード決済を有効にする前に、本番登録の完了が必要です。',
      'PayPayはStripe Connect登録完了後に、利用する団体だけ追加申請します。',
    ],
    caution: '本人確認書類、銀行口座、カード情報、パスワードをel-townの問い合わせやAIヘルプへ送らないでください。必ずStripeの登録画面へ直接入力してください。',
  },
];

const Screenshot = ({ src, alt }: { src: string; alt: string }) => (
  <figure className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-[0_18px_50px_rgba(15,23,42,.12)]">
    <a href={src} target="_blank" rel="noreferrer" className="block bg-white" aria-label={`${alt}を拡大表示`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading="lazy" className="block h-auto w-full" />
    </a>
    <figcaption className="border-t border-slate-200 bg-white px-4 py-3 text-center text-xs font-black text-sky-700"><i className="fas fa-magnifying-glass-plus mr-2" />画像を押すと拡大できます</figcaption>
  </figure>
);

export default function AdminManualPage() {
  return (
    <ManualAccessGate>
      <div className="min-h-screen bg-[#f4f8fb] text-slate-800">
        <ManualSiteHeader />
        <header className="border-b border-sky-100 text-white" style={{ background: 'linear-gradient(135deg, #073b5c 0%, #075985 52%, #0e7490 100%)' }}>
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-12 md:grid-cols-[1.35fr_.65fr] md:px-8 md:py-16">
            <div>
              <p className="mb-3 text-xs font-black tracking-[.18em] text-sky-200">el-town 役員管理画面マニュアル</p>
              <h1 className="text-3xl font-black leading-tight md:text-5xl">基本機能編</h1>
              <p className="mt-5 max-w-3xl text-base font-bold leading-8 text-sky-50 md:text-lg">団体情報、会員、会費、システム利用料、役員、Stripe連携を、実際の管理画面を見ながら確認できます。</p>
            </div>
            <div className="rounded-3xl border border-white/20 bg-white/10 p-5 backdrop-blur-sm">
              <p className="text-sm font-black text-sky-100">この章でできること</p>
              <ul className="mt-3 space-y-2 text-sm font-bold leading-6 text-white">
                <li>✓ 管理画面の入口と設定場所が分かる</li>
                <li>✓ 会費とシステム利用料を区別できる</li>
                <li>✓ Stripe登録前の準備が分かる</li>
              </ul>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8 md:py-14">
          <section className="rounded-3xl border border-sky-100 bg-white p-5 shadow-[0_14px_45px_rgba(30,64,175,.08)] md:p-8">
            <div className="grid gap-6 md:grid-cols-[.8fr_1.2fr] md:items-center">
              <div>
                <p className="text-xs font-black tracking-[.14em] text-sky-700">START</p>
                <h2 className="mt-2 text-2xl font-black text-slate-900">基本機能を開く</h2>
                <div className="mt-4 space-y-3 text-sm font-bold leading-7 text-slate-600">
                  <p><span className="mr-2 text-sky-700">1.</span>LINEリッチメニューの「役員の方」を押します。</p>
                  <p><span className="mr-2 text-sky-700">2.</span>管理トップの「基本機能」を押します。</p>
                  <p><span className="mr-2 text-sky-700">3.</span>操作したい画面の「開く」を押します。</p>
                </div>
              </div>
              <Screenshot src="/manual/screens/admin-basic/01-basic-menu.png" alt="管理トップの基本機能メニュー" />
            </div>
          </section>

          <nav className="my-10 rounded-3xl bg-slate-900 p-5 text-white md:p-7" aria-label="基本機能の目次">
            <p className="text-xs font-black tracking-[.15em] text-sky-300">目次</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {sections.map((section) => (
                <a key={section.id} href={`#${section.id}`} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black text-white no-underline transition hover:bg-white/10"><span className="mr-2 text-sky-300">{section.number}</span>{section.title}</a>
              ))}
            </div>
          </nav>

          <div className="space-y-12">
            {sections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_14px_45px_rgba(15,23,42,.07)] md:p-8">
                <div className="flex items-start gap-4">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sky-100 text-sm font-black text-sky-800">{section.number}</span>
                  <div><h2 className="text-2xl font-black text-slate-900 md:text-3xl">{section.title}</h2><p className="mt-2 text-sm font-bold leading-7 text-slate-600 md:text-base">{section.summary}</p></div>
                </div>
                <div className="mt-7"><Screenshot src={section.image} alt={section.imageAlt} /></div>
                <div className="mt-7 grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
                    <h3 className="text-base font-black text-sky-950"><i className="fas fa-list-ol mr-2 text-sky-600" />操作手順</h3>
                    <ol className="mt-4 space-y-3">
                      {section.steps.map((step, index) => <li key={step} className="grid grid-cols-[28px_1fr] gap-2 text-sm font-bold leading-6 text-slate-700"><span className="grid h-7 w-7 place-items-center rounded-full bg-sky-700 text-xs text-white">{index + 1}</span><span>{step}</span></li>)}
                    </ol>
                  </div>
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                    <h3 className="text-base font-black text-emerald-950"><i className="fas fa-check-circle mr-2 text-emerald-600" />確認ポイント</h3>
                    <ul className="mt-4 space-y-3 text-sm font-bold leading-6 text-slate-700">
                      {section.checks.map((check) => <li key={check} className="pl-5 before:-ml-5 before:mr-2 before:text-emerald-600 before:content-['✓']">{check}</li>)}
                    </ul>
                  </div>
                </div>
                {section.caution && <aside className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-7 text-amber-950"><strong className="mr-2"><i className="fas fa-triangle-exclamation mr-2 text-amber-600" />注意</strong>{section.caution}</aside>}
              </section>
            ))}
          </div>

          <section className="mt-12 rounded-3xl border border-dashed border-slate-300 bg-white p-7 text-center">
            <p className="text-xs font-black tracking-[.14em] text-slate-500">NEXT</p>
            <h2 className="mt-2 text-2xl font-black text-slate-900">次回追加予定</h2>
            <p className="mt-3 text-sm font-bold leading-7 text-slate-600">発信機能、Live・施設予約、総会会計も同じ形式で順次追加します。</p>
          </section>
        </main>
      </div>
    </ManualAccessGate>
  );
}
