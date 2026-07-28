import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

export const metadata: Metadata = {
  title: "会員として利用を開始する | el-town オンラインマニュアル",
  description: "LINEでログインし、el-townの会員名簿と本人情報を連携する手順です。",
};

const steps = [
  {
    title: "トップ画面で「会員の方」を選ぶ",
    text: "el-townのトップ画面から「会員の方」を押し、会員用画面を開きます。",
  },
  {
    title: "LINEでログインする",
    text: "「LINEでログインする」を押し、表示される認証画面で連携を許可します。el-townの利用にはLINEアカウントの連携が必要です。",
  },
  {
    title: "初回登録画面を開く",
    text: "LINE連携後、まだ会員名簿と連携していない方には「会員情報を連携」画面が表示されます。",
  },
  {
    title: "会員名簿と一致する情報を入力する",
    text: "町内会名、住所、世帯主の氏名・カナ、登録する方の氏名・カナを入力します。",
  },
  {
    title: "「連携する」を押す",
    text: "入力内容を確認して「連携する」を押します。会員画面が表示されたら登録完了です。",
  },
];

const fields = [
  ["町内会名", "エルタウン町内会"],
  ["郵便番号", "役員へ届け出ている郵便番号"],
  ["住所2", "丁目・番地（例：1丁目2-3）"],
  ["住所3", "建物名・部屋番号（ある場合）"],
  ["世帯主のお名前", "エルタウン太郎"],
  ["世帯主のカナ氏名", "エルタウン タロウ"],
  ["登録する方のお名前", "エルタウン太郎"],
  ["登録する方のカナ氏名", "エルタウン タロウ"],
];

export default function MemberSignupManualPage() {
  return (
    <main className="min-h-screen bg-[#f4f9fb] text-[#243746]">
      <header className="border-b border-[#dce8ed] bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/manual" className="text-sm font-black text-[#607b89] no-underline hover:text-[#168a51]">
            <i className="fas fa-chevron-left mr-2" aria-hidden="true" />
            マニュアル一覧
          </Link>
          <Image src="/assets/logo_horizontal_final.png" alt="el-town" width={150} height={40} className="h-auto w-[135px]" />
        </div>
      </header>

      <section className="bg-[#edf8f1] px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-black text-[#168a51]">
            <i className="fas fa-user-plus" aria-hidden="true" />
            会員向け
          </div>
          <h1 className="text-3xl font-black leading-tight text-[#203947]">会員として利用を開始する</h1>
          <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-[#506b78]">
            LINEでログインし、エルタウン町内会の会員名簿とご本人の情報を連携する手順です。
          </p>
          <p className="mt-4 text-xs font-black text-[#607b89]">
            <i className="far fa-clock mr-2" aria-hidden="true" />
            所要時間の目安：約5分
          </p>
        </div>
      </section>

      <article className="mx-auto max-w-4xl space-y-8 px-4 py-10">
        <Section title="始める前に確認してください">
          <div className="grid gap-3 md:grid-cols-3">
            <Preparation icon="fa-line fab" title="LINEアカウント" text="普段お使いのLINEアカウント" />
            <Preparation icon="fa-address-card fas" title="会員名簿の情報" text="役員へ届け出ている氏名・住所" />
            <Preparation icon="fa-mobile-screen fas" title="スマートフォン" text="LINE認証を行える端末" />
          </div>
          <div className="mt-5 rounded-2xl border border-[#bfe4ce] bg-[#f2fbf5] p-4 text-sm font-semibold leading-7 text-[#416b53]">
            <i className="fas fa-circle-info mr-2 text-[#168a51]" aria-hidden="true" />
            入力内容は、役員が登録した会員名簿と一致する必要があります。表記が分からない場合は役員へ確認してください。
          </div>
        </Section>

        <Section title="登録手順">
          <ol className="space-y-4">
            {steps.map((step, index) => (
              <li key={step.title} className="flex gap-4 rounded-2xl bg-[#f7fafb] p-5">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#168a51] text-sm font-black text-white">
                  {index + 1}
                </span>
                <div>
                  <h3 className="font-black text-[#203947]">{step.title}</h3>
                  <p className="mt-2 text-sm font-semibold leading-7 text-[#607b89]">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="/resident"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#168a51] px-5 py-3 text-sm font-black text-white no-underline hover:bg-[#117241]"
            >
              会員用画面を開く
              <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" />
            </a>
          </div>
        </Section>

        <Section title="入力項目と記入例">
          <div className="overflow-hidden rounded-2xl border border-[#dce8ed] bg-white">
            {fields.map(([label, value]) => (
              <div key={label} className="grid gap-1 border-b border-[#e5eef2] p-4 last:border-b-0 md:grid-cols-[220px_1fr]">
                <span className="text-sm font-black text-[#203947]">{label}</span>
                <span className="text-sm font-semibold text-[#607b89]">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs font-semibold leading-6 text-[#718792]">
            ご本人が世帯主でない場合は、「世帯主」と「登録する方」にそれぞれ該当する方の氏名を入力してください。
          </p>
        </Section>

        <Section title="登録できないとき">
          <ul className="space-y-3 text-sm font-semibold leading-7 text-[#506b78]">
            <li>・町内会名は略称ではなく、名簿に登録された正式名称を入力してください。</li>
            <li>・氏名、カナ、郵便番号、丁目・番地の空白や表記を確認してください。</li>
            <li>・「一致する会員名簿が見つかりません」と表示された場合は、役員へ登録内容を確認してください。</li>
            <li>・すでに家族2名まで連携済みの場合は、世帯主または役員へ確認してください。</li>
          </ul>
        </Section>
      </article>

      <footer className="pb-12 text-center">
        <Link href="/manual" className="text-sm font-black text-[#607b89] no-underline hover:text-[#168a51]">
          <i className="fas fa-book-open mr-2" aria-hidden="true" />
          マニュアル一覧へ戻る
        </Link>
      </footer>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#dce8ed] bg-white p-6 shadow-[0_10px_35px_rgba(33,78,98,.06)] md:p-8">
      <h2 className="mb-6 text-xl font-black text-[#203947]">{title}</h2>
      {children}
    </section>
  );
}

function Preparation({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-[#f2fbf5] p-4">
      <i className={`${icon} mb-3 text-[#168a51]`} aria-hidden="true" />
      <h3 className="font-black text-[#203947]">{title}</h3>
      <p className="mt-2 text-xs font-semibold leading-6 text-[#607b89]">{text}</p>
    </div>
  );
}
