import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "オンラインマニュアル | el-town",
  description: "el-townの利用者別オンラインマニュアルです。",
};

export default function ManualHubPage() {
  return (
    <main className="min-h-screen bg-[#f4f9fb] px-4 py-10 text-[#243746]">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-9 text-center">
          <Image
            src="/assets/logo_horizontal_final.png"
            alt="el-town"
            width={190}
            height={50}
            className="mx-auto mb-6 h-auto w-[170px]"
            priority
          />
          <p className="mb-2 text-xs font-black tracking-[.18em] text-[#168eb5]">ONLINE MANUAL</p>
          <h1 className="text-3xl font-black tracking-tight text-[#203947]">オンラインマニュアル</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-[#637b88]">
            やりたいことに合わせて、操作手順をご案内します。
          </p>
        </header>

        <section aria-labelledby="start-heading">
          <span className="rounded-full bg-[#dff5fb] px-3 py-1 text-[11px] font-black text-[#087dac]">
            はじめての方
          </span>
          <h2 id="start-heading" className="mt-3 text-xl font-black text-[#203947]">
            利用を開始する
          </h2>
          <p className="mt-2 text-sm font-semibold leading-7 text-[#637b88]">
            あなたの立場に合う入口を選んでください。
          </p>

          <div className="mt-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#e8f7fb] text-[#118bb3]">
                <i className="fas fa-user-tie" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-black text-[#203947]">役員の方</h3>
                <p className="text-xs font-semibold text-[#7b909b]">団体の登録状況に合わせて選びます</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <ManualCard
                href="/manual/admin-signup"
                label="代表役員向け"
                time="約5分"
                title="町内会・自治会を新規登録する"
                description="団体と最初の役員代表者を登録し、管理画面の利用を開始します。"
                icon="fa-house-circle-check"
              />
              <ManualCard
                href="/manual/admin-invite"
                label="招待された役員向け"
                time="約3分"
                title="招待を受けて役員として登録する"
                description="代表役員から届いた招待URLを使い、役員アカウントを登録します。"
                icon="fa-envelope-open-text"
              />
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#edf8f1] text-[#168a51]">
                <i className="fas fa-users" aria-hidden="true" />
              </span>
              <div>
                <h3 className="font-black text-[#203947]">会員の方</h3>
                <p className="text-xs font-semibold text-[#7b909b]">LINEと会員名簿を連携します</p>
              </div>
            </div>

            <ManualCard
              href="/manual/member-signup"
              label="会員向け"
              time="約5分"
              title="会員として利用を開始する"
              description="会員用QRコードをLINEで読み取り、エルタウン町内会の会員名簿とご本人の情報を連携します。"
              icon="fa-user-plus"
              tone="green"
            />
          </div>
        </section>

        <div className="mt-10 rounded-2xl border border-dashed border-[#c9dbe2] bg-white/60 p-6 text-center">
          <i className="fas fa-book-open mb-3 text-xl text-[#81a7b7]" aria-hidden="true" />
          <p className="text-sm font-black text-[#496573]">どの入口を選べばよいか迷ったとき</p>
          <p className="mt-2 text-xs font-semibold leading-6 text-[#7b909b]">
            団体を初めて登録する方は「新規登録」、代表役員からURLが届いた方は「招待を受けて登録」、
            地域のお知らせを受け取る方は「会員として利用を開始」を選んでください。
          </p>
        </div>

        <footer className="mt-10 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-black text-[#607b89] no-underline hover:text-[#118bb3]"
          >
            <i className="fas fa-arrow-left" aria-hidden="true" />
            el-townトップへ戻る
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
}: {
  href: string;
  label: string;
  time: string;
  title: string;
  description: string;
  icon: string;
  tone?: "blue" | "green";
}) {
  const color =
    tone === "green"
      ? {
          icon: "bg-[#edf8f1] text-[#168a51]",
          label: "text-[#168a51]",
          hover: "hover:border-[#8fd0ae]",
        }
      : {
          icon: "bg-[#e8f7fb] text-[#118bb3]",
          label: "text-[#118bb3]",
          hover: "hover:border-[#8bcde1]",
        };

  return (
    <Link
      href={href}
      className={`group block rounded-2xl border border-[#cfe1e8] bg-white p-5 no-underline shadow-[0_10px_35px_rgba(33,78,98,.07)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(33,78,98,.11)] ${color.hover}`}
    >
      <div className="flex items-start gap-4">
        <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-lg ${color.icon}`}>
          <i className={`fas ${icon}`} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`text-[11px] font-black ${color.label}`}>{label}</span>
            <span className="rounded bg-[#eef3f5] px-2 py-1 text-[10px] font-black text-[#607784]">{time}</span>
          </div>
          <h4 className="font-black leading-6 text-[#203947]">{title}</h4>
          <p className="mt-2 text-xs font-semibold leading-6 text-[#647b88]">{description}</p>
        </div>
        <i
          className="fas fa-chevron-right mt-4 text-[#91a8b3] transition group-hover:translate-x-1"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
