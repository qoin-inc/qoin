'use client';

import Link from 'next/link';
import styles from '../page.module.css';
import { useManualAccess } from './ManualAccess';

const protectedSections = [
  {
    id: 'daily-use',
    eyebrow: '日常の操作',
    title: '基本機能を使う',
    description: '利用開始後に使う、会員画面と役員管理画面の操作手順です。',
    items: [
      { href: '/manual/member', label: '会員向け', time: '全10ステップ', title: '会員向け操作マニュアル', description: '回覧板の確認、イベント参加、会費、設定などの基本操作を説明します。', icon: 'fa-mobile-screen-button', tone: 'green' },
      { href: '/manual/admin', label: '役員向け', time: '全10ステップ', title: '役員管理画面 操作マニュアル', description: 'お知らせの配信、会員名簿、会費、管理者設定などを説明します。', icon: 'fa-user-gear', tone: 'blue' },
    ],
  },
  {
    id: 'feature-guides',
    eyebrow: '機能別',
    title: '外部サービス・追加機能を設定する',
    description: '決済やオンライン会議など、必要な機能の手順を確認できます。',
    items: [
      { href: '/manual/stripe', label: '役員向け', time: '全6ステップ', title: 'Stripe連携 操作マニュアル', description: 'オンライン集金に必要なStripe登録から会費請求までを説明します。', icon: 'fa-credit-card', tone: 'purple' },
      { href: '/manual/live', label: '役員向け', time: '全8ステップ', title: 'Live・施設予約管理マニュアル', description: 'オンライン会議・配信URLの設定と施設予約の操作を説明します。', icon: 'fa-video', tone: 'purple' },
    ],
  },
];

export function ProtectedManualSections() {
  const access = useManualAccess();

  if (access === 'loading') {
    return <div className={styles.accessNotice} aria-busy="true"><i className="fas fa-spinner fa-spin" aria-hidden="true" /> 登録状態を確認しています</div>;
  }

  if (access === 'denied') {
    return (
      <section className={styles.accessNotice} aria-labelledby="registered-manuals-heading">
        <i className="fas fa-lock" aria-hidden="true" />
        <h2 id="registered-manuals-heading">登録後に利用できるマニュアル</h2>
        <p>基本機能・追加機能のマニュアルは、役員登録または会員接続後に表示されます。</p>
        <div className={styles.accessLinks}>
          <Link href="/admin">役員の方</Link>
          <Link href="/resident">会員の方</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      {protectedSections.map((section) => (
        <section key={section.id} aria-labelledby={`${section.id}-heading`} className={styles.section}>
          <span className={styles.sectionEyebrow}>{section.eyebrow}</span>
          <h2 id={`${section.id}-heading`} className={styles.sectionTitle}>{section.title}</h2>
          <p className={styles.sectionDescription}>{section.description}</p>
          <div className={`${styles.itemsGrid} ${styles.itemsGridTwo}`}>
            {section.items.map((item) => <ProtectedManualCard key={item.href} {...item} />)}
          </div>
        </section>
      ))}
    </>
  );
}

function ProtectedManualCard({ href, label, time, title, description, icon, tone }: (typeof protectedSections)[number]['items'][number]) {
  const color = tone === 'green'
    ? { iconBackground: '#edf8f1', accent: '#168a51', title: '#147748' }
    : tone === 'purple'
      ? { iconBackground: '#f0edff', accent: '#635bff', title: '#5148ce' }
      : { iconBackground: '#e8f7fb', accent: '#118bb3', title: '#087dac' };

  return (
    <Link href={href} className={styles.cardLink} aria-label={`${title}を開く`}>
      <article className={styles.card}>
        <div className={styles.cardIcon} style={{ backgroundColor: color.iconBackground, color: color.accent }}><i className={`fas ${icon}`} aria-hidden="true" /></div>
        <div className={styles.cardBody}>
          <div className={styles.cardMeta}><span style={{ color: color.accent }}>{label}</span><span className={styles.cardTime}>{time}</span></div>
          <h3 className={styles.cardTitle} style={{ color: color.title }}>{title}</h3>
          <p className={styles.cardDescription}>{description}</p>
        </div>
      </article>
    </Link>
  );
}
