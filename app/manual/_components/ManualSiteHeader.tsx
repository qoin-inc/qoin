import Image from "next/image";
import Link from "next/link";
import styles from "./ManualSiteHeader.module.css";

export function ManualSiteHeader({
  backHref = "/manual",
  backLabel = "マニュアル一覧",
}: {
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link
          href={backHref}
          style={{ minHeight: 44, paddingTop: 12, paddingBottom: 12 }}
          className={styles.backLink}
        >
          <i className="fas fa-chevron-left" aria-hidden="true" />
          <span className={styles.backLabelLong}>{backLabel}</span>
          <span className={styles.backLabelShort}>{backLabel === "管理画面へ戻る" ? "管理画面" : "一覧"}</span>
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
