import Image from "next/image";
import Link from "next/link";
import styles from "./ManualSiteHeader.module.css";

export function ManualSiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link
          href="/manual"
          style={{ minHeight: 44, paddingTop: 12, paddingBottom: 12 }}
          className={styles.backLink}
        >
          <i className="fas fa-chevron-left" aria-hidden="true" />
          <span className={styles.backLabelLong}>マニュアル一覧</span>
          <span className={styles.backLabelShort}>一覧</span>
        </Link>

        <Link
          href="/"
          aria-label="el-townトップメニューへ"
          className={styles.logoLink}
        >
          <Image
            src="/assets/logo_horizontal_final.png"
            alt="el-townトップメニューへ"
            width={150}
            height={40}
            className={styles.logo}
            priority
          />
        </Link>

        <span className={styles.spacer} aria-hidden="true" />
      </div>
    </header>
  );
}
