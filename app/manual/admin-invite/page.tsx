import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "招待を受けて役員として登録する | el-town オンラインマニュアル",
  description: "代表役員から届いた招待URLを使って、el-townの役員アカウントを登録する手順です。",
};

const steps = [
  {
    title: "代表役員から招待URLを受け取る",
    text: "招待した代表役員から、メールやメッセージで届いた専用URLを開きます。通常の役員ログイン画面からは登録できません。",
  },
  {
    title: "本人情報を入力する",
    text: "「役員として合流する」画面で、お名前、招待されたメールアドレス、パスワードを入力します。",
  },
  {
    title: "パスワードを確認する",
    text: "英大文字・英小文字・数字・記号のうち3種類以上を組み合わせ、8文字以上で設定します。確認欄にも同じパスワードを入力します。",
  },
  {
    title: "役員として合流する",
    text: "入力内容を確認し、「パスワードを設定して役員に合流する」を押します。管理画面が表示されたら登録完了です。",
  },
];

export default function AdminInviteManualPage() {
  return (
    <ManualPageShell
      audience="招待された役員向け"
      icon="fa-envelope-open-text"
      title="招待を受けて役員として登録する"
      summary="代表役員から届いた招待URLを使い、エルタウン町内会の役員アカウントを登録します。"
      time="約3分"
    >
      <GuideSection title="始める前に用意するもの">
        <div className="grid gap-3 md:grid-cols-3">
          <PreparationCard icon="fa-link" title="招待URL" text="代表役員から届いた専用URL" />
          <PreparationCard icon="fa-envelope" title="メールアドレス" text="招待先として指定されたアドレス" />
          <PreparationCard icon="fa-key" title="パスワード" text="ご自身で決める8文字以上の文字列" />
        </div>
        <Notice>
          招待URLは役員ごとに発行されます。他の方へ転送せず、ご本人が登録してください。
        </Notice>
      </GuideSection>

      <GuideSection title="登録手順">
        <ol className="space-y-4">
          {steps.map((step, index) => (
            <Step key={step.title} number={index + 1} title={step.title} text={step.text} />
          ))}
        </ol>
      </GuideSection>

      <GuideSection title="入力例">
        <div className="overflow-hidden rounded-2xl border border-[#dce8ed] bg-white">
          <ExampleRow label="お名前（または役職名）" value="副会長 エルタウン太郎" />
          <ExampleRow label="メールアドレス" value="招待を受け取ったメールアドレス" />
          <ExampleRow label="設定するパスワード" value="8文字以上（3種類以上の文字を使用）" />
          <ExampleRow label="パスワード（確認用）" value="上と同じパスワード" />
        </div>
      </GuideSection>

      <GuideSection title="登録できないとき">
        <ul className="space-y-3 text-sm font-semibold leading-7 text-[#506b78]">
          <li>・「招待情報が見つかりません」と表示された場合は、URLを省略せずに開き直してください。</li>
          <li>・メールアドレスが一致しない場合は、招待した代表役員に登録先を確認してください。</li>
          <li>・招待が利用済み・無効の場合は、代表役員へ再招待を依頼してください。</li>
        </ul>
      </GuideSection>
    </ManualPageShell>
  );
}

function ManualPageShell({
  audience,
  icon,
  title,
  summary,
  time,
  children,
}: {
  audience: string;
  icon: string;
  title: string;
  summary: string;
  time: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#f4f9fb] text-[#243746]">
      <header className="border-b border-[#dce8ed] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/manual" className="text-sm font-black text-[#607b89] no-underline hover:text-[#118bb3]">
            <i className="fas fa-chevron-left mr-2" aria-hidden="true" />
            マニュアル一覧
          </Link>
          <Image src="/assets/logo_horizontal_final.png" alt="el-town" width={150} height={40} className="h-auto w-[135px]" />
        </div>
      </header>

      <section className="bg-[#e8f7fb] px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-[#118bb3]">
            <i className={`fas ${icon}`} aria-hidden="true" />
            {audience}
          </div>
          <h1 className="text-3xl font-black leading-tight text-[#203947]">{title}</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[#506b78]">{summary}</p>
          <p className="mt-4 text-xs font-black text-[#607b89]">
            <i className="far fa-clock mr-2" aria-hidden="true" />
            所要時間の目安：{time}
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-4xl space-y-8 px-4 py-10">{children}</article>

      <footer className="pb-12 text-center">
        <Link href="/manual" className="text-sm font-black text-[#607b89] no-underline hover:text-[#118bb3]">
          <i className="fas fa-book-open mr-2" aria-hidden="true" />
          マニュアル一覧へ戻る
        </Link>
      </footer>
    </main>
  );
}

function GuideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#dce8ed] bg-white p-6 shadow-[0_10px_35px_rgba(33,78,98,.06)] md:p-8">
      <h2 className="mb-6 text-xl font-black text-[#203947]">{title}</h2>
      {children}
    </section>
  );
}

function PreparationCard({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-[#f4f9fb] p-4">
      <i className={`fas ${icon} mb-3 text-[#118bb3]`} aria-hidden="true" />
      <h3 className="font-black text-[#203947]">{title}</h3>
      <p className="mt-2 text-xs font-semibold leading-6 text-[#607b89]">{text}</p>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-5 rounded-2xl border border-[#bfe2ee] bg-[#eefaff] p-4 text-sm font-semibold leading-7 text-[#416676]">
      <i className="fas fa-circle-info mr-2 text-[#118bb3]" aria-hidden="true" />
      {children}
    </div>
  );
}

function Step({ number, title, text }: { number: number; title: string; text: string }) {
  return (
    <li className="flex gap-4 rounded-2xl bg-[#f7fafb] p-5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#118bb3] text-sm font-black text-white">{number}</span>
      <div>
        <h3 className="font-black text-[#203947]">{title}</h3>
        <p className="mt-2 text-sm font-semibold leading-7 text-[#607b89]">{text}</p>
      </div>
    </li>
  );
}

function ExampleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-[#e5eef2] p-4 last:border-b-0 md:grid-cols-[220px_1fr]">
      <span className="text-sm font-black text-[#203947]">{label}</span>
      <span className="text-sm font-semibold text-[#607b89]">{value}</span>
    </div>
  );
}
