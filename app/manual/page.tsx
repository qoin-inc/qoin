import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "オンラインマニュアル | el-town",
  description: "el-townの利用者別オンラインマニュアルです。",
};

type ManualItem = {
  href: string;
  label: string;
  time: string;
  title: string;
  description: string;
  icon: string;
  tone?: "blue" | "green" | "purple";
};

const manualSections: Array<{
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  items: ManualItem[];
}> = [
  {
    id: "getting-started",
    eyebrow: "はじめての方",
    title: "利用を開始する",
    description: "立場と登録状況に合う手順を選んでください。",
    items: [
      {
        href: "/manual/admin-signup",
        label: "代表役員向け",
        time: "約5分",
        title: "町内会・自治会を新規登録する",
        description: "団体と最初の役員代表者を登録し、管理画面の利用を開始します。",
        icon: "fa-house-circle-check",
      },
      {
        href: "/manual/admin-invite",
        label: "招待された役員向け",
        time: "約3分",
        title: "招待を受けて役員として登録する",
        description: "代表役員から届いた招待URLを使い、役員アカウントを登録します。",
        icon: "fa-envelope-open-text",
      },
      {
        href: "/manual/member-signup",
        label: "会員向け",
        time: "約5分",
        title: "会員として利用を開始する",
        description: "会員用QRコードをLINEで読み取り、会員名簿とご本人の情報を連携します。",
        icon: "fa-user-plus",
        tone: "green",
      },
    ],
  },
  {
    id: "daily-use",
    eyebrow: "日常の操作",
    title: "基本機能を使う",
    description: "利用開始後に使う、会員画面と役員管理画面の操作手順です。",
    items: [
      {
        href: "/manual/member",
        label: "会員向け",
        time: "全10ステップ",
        title: "会員向け操作マニュアル",
        description: "回覧板の確認、イベント参加、会費、設定などの基本操作を説明します。",
        icon: "fa-mobile-screen-button",
        tone: "green",
      },
      {
        href: "/manual/admin",
        label: "役員向け",
        time: "全10ステップ",
        title: "役員管理画面 操作マニュアル",
        description: "お知らせの配信、会員名簿、会費、管理者設定などを説明します。",
        icon: "fa-user-gear",
      },
    ],
  },
  {
    id: "feature-guides",
    eyebrow: "機能別",
    title: "外部サービス・追加機能を設定する",
    description: "決済やオンライン会議など、必要な機能の手順を確認できます。",
    items: [
      {
        href: "/manual/stripe",
        label: "役員向け",
        time: "全6ステップ",
        title: "Stripe連携 操作マニュアル",
        description: "オンライン集金に必要なStripe登録から会費請求までを説明します。",
        icon: "fa-credit-card",
        tone: "purple",
      },
      {
        href: "/manual/live",
        label: "役員向け",
        time: "全8ステップ",
        title: "Live・施設予約管理マニュアル",
        description: "オンライン会議・配信URLの設定と施設予約の操作を説明します。",
        icon: "fa-video",
        tone: "purple",
      },
    ],
  },
];

export default function ManualHubPage() {
  return (
    <main className="min-h-screen bg-[#f4f9fb] px-4 py-10 text-[#243746]">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-9 text-center">
          <Link
            href="/"
            aria-label="el-townトップメニューへ"
            className="mx-auto mb-6 inline-flex min-h-14 items-center rounded-2xl px-4 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#118bb3]"
          >
            <Image
              src="/assets/logo_horizontal_final.png"
              alt="el-townトップメニューへ"
              width={190}
              height={50}
              className="h-auto w-[170px]"
              priority
            />
          </Link>
          <p className="mb-2 text-xs font-black tracking-[.18em] text-[#168eb5]">ONLINE MANUAL</p>
          <h1 className="text-3xl font-black tracking-tight text-[#203947]">オンラインマニュアル</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-[#637b88]">
            目的に合うマニュアル名を選んで、操作手順を確認してください。
          </p>
        </header>

        <nav aria-label="オンラインマニュアル一覧" className="space-y-10">
          {manualSections.map((section) => (
            <section
              key={section.id}
              aria-labelledby={`${section.id}-heading`}
              className="rounded-[2rem] border border-[#d7e6ec] bg-white/75 p-5 shadow-[0_12px_40px_rgba(33,78,98,.06)] sm:p-7"
            >
              <span className="rounded-full bg-[#dff5fb] px-3 py-1 text-[11px] font-black text-[#087dac]">
                {section.eyebrow}
              </span>
              <h2 id={`${section.id}-heading`} className="mt-3 text-xl font-black text-[#203947]">
                {section.title}
              </h2>
              <p className="mt-2 text-sm font-semibold leading-7 text-[#637b88]">{section.description}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {section.items.map((item) => (
                  <ManualCard key={item.href} {...item} />
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="mt-10 rounded-2xl border border-dashed border-[#c9dbe2] bg-white/60 p-6 text-center">
          <i className="fas fa-book-open mb-3 text-xl text-[#81a7b7]" aria-hidden="true" />
          <p className="text-sm font-black text-[#496573]">どのマニュアルを選べばよいか迷ったとき</p>
          <p className="mt-2 text-xs font-semibold leading-6 text-[#7b909b]">
            初めて登録する場合は「利用を開始する」、登録後の操作は「基本機能を使う」、
            決済やオンライン会議の設定は「外部サービス・追加機能を設定する」から選んでください。
          </p>
        </div>

        <footer className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-[#9bcbd9] bg-white px-7 py-4 text-base font-black text-[#176f8d] underline decoration-2 underline-offset-4 shadow-sm transition hover:border-[#118bb3] hover:bg-[#eaf8fc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#118bb3] sm:w-auto"
          >
            <span aria-hidden="true">←</span>
            <span>el-town トップへ戻る</span>
          </Link>
        </footer>
      </div>
    </main>
  );
}

function ManualCard({
  href,
  label,
  time,
  title,
  description,
  icon,
  tone = "blue",
}: ManualItem) {
  const color =
    tone === "green"
      ? {
          icon: "bg-[#edf8f1] text-[#168a51]",
          label: "text-[#168a51]",
          link: "text-[#147748] hover:text-[#0d5d38]",
        }
      : tone === "purple"
        ? {
            icon: "bg-[#f0edff] text-[#635BFF]",
            label: "text-[#635BFF]",
            link: "text-[#5148ce] hover:text-[#3c35a5]",
          }
        : {
          icon: "bg-[#e8f7fb] text-[#118bb3]",
          label: "text-[#118bb3]",
          link: "text-[#087dac] hover:text-[#075f82]",
        };

  return (
    <article className="rounded-2xl border border-[#cfe1e8] bg-white p-5 shadow-[0_10px_35px_rgba(33,78,98,.07)]">
      <div className="flex items-start gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg ${color.icon}`}>
          <i className={`fas ${icon}`} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`text-[11px] font-black ${color.label}`}>{label}</span>
            <span className="rounded bg-[#eef3f5] px-2 py-1 text-[10px] font-black text-[#607784]">{time}</span>
          </div>
          <h3 className="leading-6">
            <Link
              href={href}
              style={{ minHeight: 44, paddingTop: 8, paddingBottom: 8 }}
              className={`inline-flex min-h-11 items-center gap-2 rounded-lg py-2 font-black underline decoration-2 underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${color.link}`}
            >
              {title}
              <i className="fas fa-arrow-right text-xs" aria-hidden="true" />
            </Link>
          </h3>
          <p className="mt-2 text-xs font-semibold leading-6 text-[#647b88]">{description}</p>
        </div>
      </div>
    </article>
  );
}
