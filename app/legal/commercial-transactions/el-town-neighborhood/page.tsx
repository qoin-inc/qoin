import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記（検証用） | エルタウン町内会",
  description: "el-townの町内会・自治会向け、特定商取引法に基づく表記ページの検証用テンプレートです。",
  robots: {
    index: false,
    follow: false,
  },
};

const rows = [
  {
    label: "役務提供事業者",
    value: "エルタウン町内会",
    note: "検証用の架空の町内会・自治会名です。本番ではStripeへ登録した町内会・自治会の正式名称を表示します。",
  },
  {
    label: "運営責任者",
    value: "検証用責任者",
    note: "本番では町内会・自治会の代表者、または会費受付業務の責任者を表示します。",
  },
  {
    label: "所在地",
    value: "〒990-0042 山形県山形市七日町（検証用・番地非表示）",
    note: "郵便番号と地域は緑区町内会の登録内容を参照しています。本番では確認済みの正確な活動所在地を表示します。",
  },
  {
    label: "電話番号",
    value: "検証用のため掲載していません",
    note: "本番では確実に連絡できる町内会・自治会窓口を表示します。",
  },
  {
    label: "メールアドレス",
    value: "検証用のため掲載していません",
    note: "本番では会費に関する問い合わせを受け付ける町内会・自治会窓口を表示します。",
  },
  {
    label: "役務の内容",
    value: "町内会・自治会の年度会費",
    note: "地域活動、情報提供および町内会・自治会運営に充てる年度会費の受付を想定したテンプレートです。",
  },
  {
    label: "会費",
    value: "年額 5,000円／世帯（検証用金額）",
    note: "本番では、会員ごとにel-townの会費画面へ表示された請求額が適用されます。",
  },
  {
    label: "会費以外の負担",
    value: "インターネット接続に必要な通信料",
    note: "決済手数料は会員へ別途請求しない想定です。",
  },
  {
    label: "支払方法",
    value: "クレジットカード、デビットカード、対応プリペイドカード、Apple Pay、Google Pay",
    note: "PayPayはStripeによる審査とel-town側の対応完了後に利用可能となる予定です。",
  },
  {
    label: "支払時期",
    value: "会費画面で内容を確認し、決済を確定した時点",
  },
  {
    label: "役務提供期間",
    value: "毎年4月1日から翌年3月31日まで",
    note: "4月開始年度は緑区町内会の登録内容を参照しています。",
  },
  {
    label: "申込期限",
    value: "町内会・自治会が会費画面または会員向け案内で指定する期日まで",
  },
  {
    label: "キャンセル・返金",
    value: "決済後の会費は、二重払い・誤請求など町内会・自治会が認める場合を除き、原則として返金しません。",
    note: "返金が必要な場合は町内会・自治会窓口へご連絡ください。本番では各町内会・自治会が定めた規約を表示します。",
  },
  {
    label: "決済の安全性",
    value: "オンライン決済はStripeの決済画面で行います。",
    note: "el-townおよび町内会・自治会は、会員のカード番号を直接取得・保存しません。",
  },
] as const;

export default function ElTownNeighborhoodCommercialTransactionsPage() {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <Link className={styles.brand} href="/" aria-label="el-townトップへ戻る">
            <span className={styles.brandMark}>e</span>
            <span>el-town</span>
          </Link>
          <div className={styles.badge}>公開テンプレート・検証用</div>
          <p className={styles.eyebrow}>エルタウン町内会</p>
          <h1>特定商取引法に基づく表記</h1>
          <p className={styles.lead}>
            町内会・自治会がel-townで年度会費を受け付ける際の、公開情報を確認するためのテンプレートです。
          </p>
        </div>
      </header>

      <section className={styles.notice} aria-label="検証用ページについて">
        <strong>このページは実際の取引には使用できません</strong>
        <p>
          エルタウン町内会は検証用の架空の町内会・自治会です。実在する町内会・自治会、人物、連絡先とは関係ありません。
          掲載内容を使用した会費請求や決済は行いません。
        </p>
      </section>

      <section className={styles.content} aria-labelledby="disclosure-heading">
        <div className={styles.heading}>
          <p>DISCLOSURE</p>
          <h2 id="disclosure-heading">会費受付に関する表示事項</h2>
          <span>最終更新日：2026年7月26日</span>
        </div>

        <dl className={styles.table}>
          {rows.map((row) => (
            <div className={styles.row} key={row.label}>
              <dt>{row.label}</dt>
              <dd>
                <strong>{row.value}</strong>
                {"note" in row && row.note ? <small>{row.note}</small> : null}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.flow} aria-labelledby="payment-flow-heading">
        <div>
          <p className={styles.eyebrow}>PAYMENT FLOW</p>
          <h2 id="payment-flow-heading">会員が確認する決済の流れ</h2>
        </div>
        <ol>
          <li><span>1</span><strong>会費画面で年度・請求額・支払期限を確認</strong></li>
          <li><span>2</span><strong>本ページで町内会・自治会情報と返金条件を確認</strong></li>
          <li><span>3</span><strong>Stripeの安全な決済画面で支払方法を選択</strong></li>
          <li><span>4</span><strong>決済完了後、el-townへ入金状況を反映</strong></li>
        </ol>
      </section>

      <footer className={styles.footer}>
        <p>本番公開前に、町内会・自治会の正式名称・責任者・所在地・連絡先・会費・返金条件を必ず確認します。</p>
        <Link href="/">el-townトップへ戻る</Link>
      </footer>
    </main>
  );
}
