import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "町内会・自治会の新規申し込み | el-town オンラインマニュアル",
  description:
    "町内会・自治会の役員代表者が、el-townへ団体と代表者アカウントを新規登録する手順です。",
};

const preparationItems = [
  {
    icon: "fa-people-roof",
    title: "団体の基本情報",
    text: "町内会・自治会の正式名称、活動地域の郵便番号、おおよその会員世帯数",
  },
  {
    icon: "fa-id-card",
    title: "代表者の情報",
    text: "役職と氏名。最初に申し込む方が、el-town上の代表役員になります",
  },
  {
    icon: "fa-envelope",
    title: "使用できるメールアドレス",
    text: "今後も役員が確認できるアドレスを推奨します。登録後のログインに使用します",
  },
];

const formItems = [
  {
    label: "町内会・自治会名",
    example: "エルタウン町内会",
    note: "略称ではなく、普段使用している正式な団体名を入力します。",
  },
  {
    label: "郵便番号",
    example: "100-0001",
    note: "町内会館や主な活動地域など、団体の連絡先として使用する地域の郵便番号を入力します。",
  },
  {
    label: "会員世帯数",
    example: "500世帯未満",
    note: "現在のおおよその規模に合う選択肢を選びます。正確な世帯数でなくても構いません。",
  },
  {
    label: "役職",
    example: "会長",
    note: "申し込みを行う方の現在の役職を入力します。",
  },
  {
    label: "お名前",
    example: "エルタウン太郎",
    note: "申し込みを行う役員ご本人の氏名を入力します。",
  },
  {
    label: "メールID",
    example: "admin@example.com",
    note: "el-townへのログインに使用します。入力間違いがないか、登録前に確認してください。",
  },
  {
    label: "ログインパスワード",
    example: "8文字以上・3種類以上の文字を使用",
    note: "英大文字・英小文字・数字・記号のうち3種類以上を組み合わせ、8文字以上で設定します。",
  },
  {
    label: "ログインパスワード（確認用）",
    example: "上と同じパスワード",
    note: "確認のため、設定したパスワードをもう一度入力します。",
  },
];

const steps = [
  {
    number: "1",
    title: "役員ログイン画面を開く",
    text: "el-townのトップ画面で「役員の方」を選び、役員ログイン画面を開きます。",
  },
  {
    number: "2",
    title: "新規登録を選ぶ",
    text: "画面下部の「新規の町内会・自治会を登録する」を押します。",
  },
  {
    number: "3",
    title: "団体と代表者の情報を入力する",
    text: "表示された8項目を上から順に入力します。入力内容は、登録後の管理画面でも使用されます。",
  },
  {
    number: "4",
    title: "内容を確認して登録する",
    text: "メールアドレスや団体名に間違いがないことを確認し、「登録して開始」を押します。",
  },
];

export default function AdminSignupManualPage() {
  return (
    <main className={styles.page} id="top">
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link className={styles.backLink} href="/manual">
            <i className="fas fa-chevron-left" aria-hidden="true" />
            マニュアル一覧
          </Link>
          <Image
            className={styles.logo}
            src="/assets/logo_horizontal_final.png"
            alt="el-town"
            width={180}
            height={48}
            priority
          />
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.eyebrow}>
            <i className="fas fa-user-tie" aria-hidden="true" />
            役員代表者向け
          </div>
          <h1>町内会・自治会を<br className={styles.mobileBreak} />新規申し込みする</h1>
          <p>
            団体を初めてel-townへ登録する役員代表者の手順です。
            <br />
            お申し込み前の準備から、管理画面が開くまでをご案内します。
          </p>
          <div className={styles.heroMeta}>
            <span><i className="far fa-clock" aria-hidden="true" /> 所要時間の目安：5分</span>
            <span><i className="fas fa-list-check" aria-hidden="true" /> 入力項目：8項目</span>
          </div>
        </div>
      </section>

      <div className={styles.layout}>
        <aside className={styles.toc} aria-label="このページの内容">
          <p>このページの内容</p>
          <a href="#before">1. お申し込み前の準備</a>
          <a href="#steps">2. お申し込み手順</a>
          <a href="#fields">3. 入力項目の説明</a>
          <a href="#after">4. 登録が完了したら</a>
          <a href="#trouble">5. 困ったとき</a>
        </aside>

        <article className={styles.content}>
          <section id="before" className={styles.section}>
            <SectionHeading number="1" eyebrow="BEFORE YOU START" title="お申し込み前の準備" />
            <p className={styles.lead}>
              次の情報を手元に用意すると、申し込みをスムーズに進められます。
            </p>
            <div className={styles.preparationGrid}>
              {preparationItems.map((item) => (
                <div className={styles.preparationCard} key={item.title}>
                  <i className={`fas ${item.icon}`} aria-hidden="true" />
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </div>
              ))}
            </div>
            <InfoBox
              kind="notice"
              icon="fa-circle-info"
              title="誰が申し込みますか？"
              text="会長など、団体を代表してel-townの利用を開始する役員の方がお申し込みください。ほかの役員は、団体登録後に管理画面から追加できます。"
            />
          </section>

          <section id="steps" className={styles.section}>
            <SectionHeading number="2" eyebrow="HOW TO APPLY" title="お申し込み手順" />
            <div className={styles.steps}>
              {steps.map((step, index) => (
                <div className={styles.step} key={step.number}>
                  <div className={styles.stepNumber}>STEP {step.number}</div>
                  <div className={styles.stepBody}>
                    <h3>{step.title}</h3>
                    <p>{step.text}</p>
                    {index === 1 && <LoginScreenPreview />}
                    {index === 3 && (
                      <div className={styles.actionPreview}>
                        <i className="fas fa-check" aria-hidden="true" />
                        登録して開始
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.ctaBox}>
              <div>
                <strong>準備ができた方はこちら</strong>
                <p>申し込み画面は別のタブで開きます。</p>
              </div>
              <a href="/admin?mode=signup" target="_blank" rel="noreferrer">
                新規申し込み画面を開く
                <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" />
              </a>
            </div>
          </section>

          <section id="fields" className={styles.section}>
            <SectionHeading number="3" eyebrow="FORM GUIDE" title="入力項目の説明" />
            <p className={styles.lead}>
              申し込み画面では、以下の8項目を入力します。すべて必須です。
            </p>
            <div className={styles.fieldList}>
              {formItems.map((item, index) => (
                <div className={styles.fieldItem} key={item.label}>
                  <span className={styles.fieldNumber}>{index + 1}</span>
                  <div>
                    <h3>{item.label}<em>必須</em></h3>
                    <div className={styles.example}>入力例：{item.example}</div>
                    <p>{item.note}</p>
                  </div>
                </div>
              ))}
            </div>
            <InfoBox
              kind="warning"
              icon="fa-shield-halved"
              title="メールアドレスとパスワードの取り扱い"
              text="英大文字・英小文字・数字・記号のうち3種類以上を組み合わせ、8文字以上で設定します。確認欄にも同じパスワードを入力してください。複数の人で共有せず、メールや回覧文書へ記載しないでください。"
            />
          </section>

          <section id="after" className={styles.section}>
            <SectionHeading number="4" eyebrow="AFTER SIGN-UP" title="登録が完了したら" />
            <div className={styles.completeCard}>
              <div className={styles.completeIcon}>
                <i className="fas fa-check" aria-hidden="true" />
              </div>
              <div>
                <h3>管理画面が表示されたら、申し込み完了です</h3>
                <p>
                  登録した代表者は、そのまま団体の管理画面を利用できます。最初に団体名と代表者名が正しいことを確認してください。
                </p>
              </div>
            </div>
            <ol className={styles.afterList}>
              <AfterItem number="1" title="団体の基本情報を確認" text="名称、郵便番号、会員規模に誤りがないか確認します。" />
              <AfterItem number="2" title="ほかの役員を追加" text="共同で管理する役員は、代表者が管理画面から招待します。" />
              <AfterItem number="3" title="初期設定を進める" text="会員名簿や会費など、利用する機能の設定へ進みます。" />
            </ol>
          </section>

          <section id="trouble" className={styles.section}>
            <SectionHeading number="5" eyebrow="TROUBLESHOOTING" title="困ったとき" />
            <div className={styles.faq}>
              <details>
                <summary>「入力してください」と表示される</summary>
                <p>未入力の項目がないか確認してください。パスワードは3種類以上の文字を組み合わせた8文字以上とし、確認欄にも同じ内容を入力します。</p>
              </details>
              <details>
                <summary>登録に失敗したと表示される</summary>
                <p>通信環境を確認し、時間をおいてもう一度お試しください。繰り返し表示される場合は、表示されたメッセージを控えてお問い合わせください。</p>
              </details>
              <details>
                <summary>すでに登録したメールアドレスを使いたい</summary>
                <p>同じメールアドレスで登録済みの場合は、新規申し込みではなく役員ログイン画面からログインしてください。</p>
              </details>
              <details>
                <summary>登録内容をあとから変更したい</summary>
                <p>登録完了後、管理画面の設定から団体の基本情報を確認・変更できます。</p>
              </details>
            </div>
          </section>

          <nav className={styles.bottomNav} aria-label="マニュアル内の移動">
            <Link href="/manual">
              <i className="fas fa-book-open" aria-hidden="true" />
              マニュアル一覧へ戻る
            </Link>
            <a href="#top">
              ページ上部へ
              <i className="fas fa-arrow-up" aria-hidden="true" />
            </a>
          </nav>
        </article>
      </div>
    </main>
  );
}

function SectionHeading({ number, eyebrow, title }: { number: string; eyebrow: string; title: string }) {
  return (
    <div className={styles.sectionHeading}>
      <span>{number}</span>
      <div>
        <p>{eyebrow}</p>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function InfoBox({ kind, icon, title, text }: { kind: "notice" | "warning"; icon: string; title: string; text: string }) {
  return (
    <div className={kind === "notice" ? styles.notice : styles.warning}>
      <i className={`fas ${icon}`} aria-hidden="true" />
      <div><strong>{title}</strong><p>{text}</p></div>
    </div>
  );
}

function AfterItem({ number, title, text }: { number: string; title: string; text: string }) {
  return (
    <li>
      <span>{number}</span>
      <div><strong>{title}</strong><p>{text}</p></div>
    </li>
  );
}

function LoginScreenPreview() {
  return (
    <div className={styles.miniScreen} aria-label="役員ログイン画面のイメージ">
      <div className={styles.miniScreenHeader}><span /><span /><span /></div>
      <div className={styles.miniScreenBody}>
        <div className={styles.loginMark}><i className="fas fa-user-shield" aria-hidden="true" /></div>
        <div className={styles.fakeLine} />
        <div className={styles.fakeLineShort} />
        <div className={styles.signupButton}>
          <i className="fas fa-house-circle-check" aria-hidden="true" />
          新規の町内会・自治会を登録する
        </div>
      </div>
    </div>
  );
}
