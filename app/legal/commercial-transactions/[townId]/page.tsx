import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const loadDisclosure = async (townId: string) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data } = await supabase
    .from("neighborhood_commercial_disclosures")
    .select("*")
    .eq("neighborhood_id", townId)
    .eq("publication_status", "published")
    .maybeSingle();
  return data;
};

export async function generateMetadata({ params }: { params: { townId: string } }): Promise<Metadata> {
  const disclosure = await loadDisclosure(params.townId);
  return {
    title: disclosure ? `特定商取引法に基づく表記｜${disclosure.seller_name}` : "特定商取引法に基づく表記",
    description: disclosure ? `${disclosure.seller_name}の会費決済に関する表示事項です。` : undefined,
    robots: { index: false, follow: false },
  };
}

const yen = (amount: number) => `¥${Number(amount || 0).toLocaleString("ja-JP")}`;

export default async function CommercialTransactionsPage({ params }: { params: { townId: string } }) {
  const disclosure = await loadDisclosure(params.townId);
  if (!disclosure) notFound();

  const rows = [
    ["役務提供事業者", disclosure.seller_name],
    ["運営責任者", disclosure.representative_name],
    ["所在地", `〒${disclosure.postal_code} ${disclosure.address}`],
    ["電話番号", disclosure.phone],
    ["メールアドレス", disclosure.email],
    ["役務の内容", disclosure.fee_name],
    ["会費", `${yen(disclosure.fee_amount)}（町内会・自治会の案内に基づく）`],
    ["会費以外の負担", disclosure.additional_fees],
    ["支払方法", disclosure.payment_methods],
    ["支払時期", disclosure.payment_timing],
    ["役務の提供時期", disclosure.service_timing],
    ["申込期間", disclosure.application_period],
    ["解約・返金条件", disclosure.cancellation_refund],
    ["問い合わせ対応", disclosure.business_hours || "上記の電話番号またはメールアドレスへお問い合わせください。"],
  ];

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}><span>e</span> el-town</Link>
        <p>町内会・自治会 会費決済</p>
        <h1>特定商取引法に基づく表記</h1>
        <strong>{disclosure.seller_name}</strong>
      </header>

      <section className={styles.notice}>
        このページは、団体からの申請内容をel-town運営が確認したうえで公開しています。
      </section>

      <section className={styles.card}>
        <dl>
          {rows.map(([label, value]) => (
            <div className={styles.row} key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.security}>
        <h2>決済について</h2>
        <p>オンライン決済はStripeの決済画面で行います。el-townおよび団体は、会員のカード番号やPayPay認証情報を直接取得・保存しません。</p>
      </section>

      <footer className={styles.footer}>
        <p>掲載内容については、上記の団体窓口へお問い合わせください。</p>
        <Link href="/">el-townへ戻る</Link>
      </footer>
    </main>
  );
}
