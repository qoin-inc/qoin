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
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <span className="rounded-full bg-[#dff5fb] px-3 py-1 text-[11px] font-black text-[#087dac]">
                はじめての方
              </span>
              <h2 id="start-heading" className="mt-3 text-xl font-black text-[#203947]">
                利用を開始する
              </h2>
            </div>
            <span className="text-xs font-bold text-[#8296a0]">順次追加予定</span>
          </div>

          <Link
            href="/manual/admin-signup"
            className="group block rounded-2xl border border-[#cfe1e8] bg-white p-6 no-underline shadow-[0_10px_35px_rgba(33,78,98,.07)] transition hover:-translate-y-0.5 hover:border-[#8bcde1] hover:shadow-[0_14px_40px_rgba(33,78,98,.11)]"
          >
            <div className="flex items-start gap-5">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#e8f7fb] text-xl text-[#118bb3]">
                <i className="fas fa-house-circle-check" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black text-[#118bb3]">役員代表者向け</span>
                  <span className="rounded bg-[#eef3f5] px-2 py-1 text-[10px] font-black text-[#607784]">約5分</span>
                </div>
                <h3 className="text-lg font-black text-[#203947]">町内会・自治会を新規申し込みする</h3>
                <p className="mt-2 text-sm font-semibold leading-7 text-[#647b88]">
                  団体と最初の役員代表者を登録し、管理画面の利用を開始するまでの手順です。
                </p>
              </div>
              <i
                className="fas fa-chevron-right mt-5 text-[#91a8b3] transition group-hover:translate-x-1 group-hover:text-[#118bb3]"
                aria-hidden="true"
              />
            </div>
          </Link>
        </section>

        <div className="mt-10 rounded-2xl border border-dashed border-[#c9dbe2] bg-white/60 p-6 text-center">
          <i className="fas fa-book-open mb-3 text-xl text-[#81a7b7]" aria-hidden="true" />
          <p className="text-sm font-black text-[#496573]">このマニュアルは、実際の利用順に作成しています</p>
          <p className="mt-2 text-xs font-semibold leading-6 text-[#7b909b]">
            役員の追加、団体の初期設定、会員登録などの手順を順次追加します。
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
