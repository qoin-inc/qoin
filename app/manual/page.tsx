import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

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
        description: "町内会・自治会と最初の役員代表者を登録し、管理画面の利用を開始します。",
        icon: "fa-house",
      },
      {
        href: "/manual/admin-invite",
        label: "招待された役員向け",
        time: "約3〜5分",
        title: "招待を受けて役員として登録する",
        description: "招待URLから役員登録し、複数の町内会・自治会の追加や切替を行います。",
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
];

export default function ManualHubPage() {
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.hero}>
          <Link
            href="/"
            aria-label="el-townトップメニューへ"
            className={styles.heroLogoLink}
          >
            <Image
              src="/assets/logo_horizontal_final.png"
              alt="el-townトップメニューへ"
              width={190}
              height={50}
              className={styles.heroLogo}
              priority
            />
          </Link>
          <p className={styles.kicker}>ONLINE MANUAL</p>
          <h1 className={styles.title}>オンラインマニュアル</h1>
          <p className={styles.lead}>
            目的に合うマニュアル名を選んで、操作手順を確認してください。
          </p>
        </header>

        <nav aria-label="オンラインマニュアル一覧" className={styles.nav}>
          {manualSections.map((section) => (
            <section
              key={section.id}
              aria-labelledby={`${section.id}-heading`}
              className={styles.section}
            >
              <span className={styles.sectionEyebrow}>
                {section.eyebrow}
              </span>
              <h2 id={`${section.id}-heading`} className={styles.sectionTitle}>
                {section.title}
              </h2>
              <p className={styles.sectionDescription}>{section.description}</p>
              <div className={`${styles.itemsGrid} ${section.items.length === 3 ? styles.itemsGridThree : styles.itemsGridTwo}`}>
                {section.items.map((item) => (
                  <ManualCard key={item.href} {...item} />
                ))}
              </div>
            </section>
          ))}
        </nav>

        <footer className={styles.footer}>
          <Link
            href="/"
            className={styles.homeLink}
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
          iconBackground: "#edf8f1",
          accent: "#168a51",
          title: "#147748",
        }
      : tone === "purple"
        ? {
            iconBackground: "#f0edff",
            accent: "#635bff",
            title: "#5148ce",
          }
        : {
          iconBackground: "#e8f7fb",
          accent: "#118bb3",
          title: "#087dac",
        };

  return (
    <Link href={href} className={styles.cardLink} aria-label={`${title}を開く`}>
      <article className={styles.card}>
        <div className={styles.cardIcon} style={{ backgroundColor: color.iconBackground, color: color.accent }}>
          <i className={`fas ${icon}`} aria-hidden="true" />
        </div>
        <div className={styles.cardBody}>
          <div className={styles.cardMeta}>
            <span style={{ color: color.accent }}>{label}</span>
            <span className={styles.cardTime}>{time}</span>
          </div>
          <h3 className={styles.cardTitle} style={{ color: color.title }}>{title}</h3>
          <p className={styles.cardDescription}>{description}</p>
        </div>
      </article>
    </Link>
  );
}
