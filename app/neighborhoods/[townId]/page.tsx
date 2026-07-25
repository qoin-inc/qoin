import type { Metadata } from "next";
import Image from "next/image";
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
    title: disclosure ? `${disclosure.seller_name}｜会費のご案内` : "町内会・自治会 会費のご案内",
    description: disclosure ? `${disclosure.seller_name}の${disclosure.fee_name}とオンライン決済のご案内です。` : undefined,
    robots: { index: false, follow: false },
  };
}

export default async function NeighborhoodPublicPage({ params }: { params: { townId: string } }) {
  const disclosure = await loadDisclosure(params.townId);
  if (!disclosure) notFound();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Image src="/logo_horizontal_final.png" alt="el-town" width={180} height={48} priority />
        </Link>
        <span>町内会・自治会 公開ページ</span>
      </header>

      <section className={styles.hero}>
        <div>
          <p>ANNUAL MEMBERSHIP FEE</p>
          <h1>{disclosure.seller_name}</h1>
          <h2>{disclosure.fee_name}のご案内</h2>
          <p>{disclosure.service_timing}</p>
        </div>
        <div className={styles.feeCard}>
          <Image src="/icon_el_town.png" alt="" width={88} height={88} />
          <small>{disclosure.fee_name}</small>
          <strong>¥{Number(disclosure.fee_amount || 0).toLocaleString("ja-JP")}</strong>
          <span>オンライン決済対応</span>
        </div>
      </section>

      <section className={styles.content}>
        <article>
          <h2>お支払いについて</h2>
          <p>{disclosure.payment_methods}</p>
          <p>{disclosure.payment_timing}</p>
          <p className={styles.note}>会員ごとの請求内容を確認するため、お支払いは会員ログイン後の「会費・支払い」画面から行います。</p>
          <Link className={styles.action} href="/resident?tab=payment">会員画面で会費を確認する</Link>
        </article>
        <article>
          <h2>申込・返金条件</h2>
          <p>{disclosure.application_period}</p>
          <p>{disclosure.cancellation_refund}</p>
        </article>
      </section>

      <footer className={styles.footer}>
        <p>{disclosure.seller_name}</p>
        <nav>
          <Link href={`/legal/commercial-transactions/${params.townId}`}>特定商取引法に基づく表記</Link>
          <Link href="/">el-town</Link>
        </nav>
      </footer>
    </main>
  );
}
