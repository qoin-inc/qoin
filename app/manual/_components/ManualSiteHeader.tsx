import Image from "next/image";
import Link from "next/link";

export function ManualSiteHeader() {
  return (
    <header className="border-b border-[#dce8ed] bg-white">
      <div className="mx-auto grid min-h-20 w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3">
        <Link
          href="/manual"
          style={{ minHeight: 44, paddingTop: 12, paddingBottom: 12 }}
          className="inline-flex min-h-11 items-center justify-self-start rounded-xl px-3 py-3 text-sm font-black text-[#496573] underline decoration-2 underline-offset-4 transition hover:bg-[#eef8fb] hover:text-[#087dac]"
        >
          <i className="fas fa-chevron-left mr-2" aria-hidden="true" />
          <span className="hidden sm:inline">マニュアル一覧</span>
          <span className="sm:hidden">一覧</span>
        </Link>

        <Link
          href="/"
          aria-label="el-townトップメニューへ"
          className="inline-flex min-h-12 items-center rounded-xl px-3 transition hover:bg-[#eef8fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#118bb3]"
        >
          <Image
            src="/assets/logo_horizontal_final.png"
            alt="el-townトップメニューへ"
            width={150}
            height={40}
            className="h-auto w-[135px]"
            priority
          />
        </Link>

        <span aria-hidden="true" />
      </div>
    </header>
  );
}
