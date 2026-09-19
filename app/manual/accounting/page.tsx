import type { Metadata } from "next";
import { OnboardingGuide } from "../_components/OnboardingGuide";
import { ManualAccessGate } from "../_components/ManualAccess";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "役員管理画面 総会会計編 | el-town オンラインマニュアル",
  description: "会計科目、予算、会計明細、総会資料の作成方法を説明します。",
};

type AccountingTab = "categories" | "budget" | "settlement" | "report";

const tabs: Array<{ key: AccountingTab; label: string; icon: string }> = [
  { key: "categories", label: "会計科目登録", icon: "fa-list-check" },
  { key: "budget", label: "予算入力", icon: "fa-file-invoice" },
  { key: "settlement", label: "会計処理", icon: "fa-receipt" },
  { key: "report", label: "総会資料作成", icon: "fa-print" },
];

function AssemblyYearScreenPreview() {
  return (
    <figure className={styles.figure}>
      <div className={styles.browserBar} aria-hidden="true">
        <span /><span /><span />
        <strong>el-town 管理機能</strong>
      </div>
      <div className={styles.screen}>
        <header className={styles.screenHeader}>
          <div>
            <small>総会会計</small>
            <h4>操作する画面を選んでください</h4>
          </div>
          <div className={styles.year}><span>会計年度</span><strong>2026</strong></div>
        </header>
        <div className={styles.closureCard}>
          <div className={styles.closureInfo}>
            <span><i className="fas fa-pen-to-square" /> 未確定</span>
            <strong>2026年度の総会会計</strong>
            <p>内容を確認して年度確定すると、改版スナップショットとして保存され変更不可になります。</p>
          </div>
          <button className={styles.closureButton}><i className="fas fa-lock" /> 年度確定</button>
        </div>
        <nav className={styles.tabs} aria-label="総会会計の画面例">
          {tabs.map((tab) => (
            <span key={tab.key}>
              <i className={`fas ${tab.icon}`} />
              {tab.label}
            </span>
          ))}
        </nav>
      </div>
    </figure>
  );
}

function AccountingScreenPreview({ active }: { active: AccountingTab }) {
  return (
    <figure className={styles.figure}>
      <div className={styles.browserBar} aria-hidden="true">
        <span /><span /><span />
        <strong>el-town 管理機能</strong>
      </div>
      <div className={styles.screen}>
        <header className={styles.screenHeader}>
          <div>
            <small>総会会計</small>
            <h4>操作する画面を選んでください</h4>
          </div>
          <div className={styles.year}><span>会計年度</span><strong>2026</strong></div>
        </header>
        <div className={styles.status}>
          <span><i className="fas fa-pen-to-square" /> 未確定</span>
          <strong>2026年度の総会会計</strong>
        </div>
        <nav className={styles.tabs} aria-label="総会会計の画面例">
          {tabs.map((tab) => (
            <span className={tab.key === active ? styles.activeTab : ""} key={tab.key}>
              <i className={`fas ${tab.icon}`} />
              {tab.label}
            </span>
          ))}
        </nav>
        <div className={styles.content}>{renderPreviewContent(active)}</div>
      </div>
    </figure>
  );
}

function renderPreviewContent(active: AccountingTab) {
  if (active === "categories") {
    return (
      <>
        <div className={styles.contentHeading}><div><h5>科目を追加</h5><p>親科目または補助科目として登録します。</p></div></div>
        <div className={styles.formGrid}>
          <label><span>区分</span><b>収入</b></label>
          <label><span>親科目</span><b>親科目として登録</b></label>
          <label><span>科目名</span><b>例：会費</b></label>
          <label><span>表示順</span><b>10</b></label>
        </div>
        <div className={styles.twoColumns}><div><h6>収入科目</h6><p>会費</p><p>補助金</p></div><div><h6>支出科目</h6><p>事務費</p><p>印刷費</p></div></div>
      </>
    );
  }

  if (active === "budget") {
    return (
      <>
        <div className={styles.contentHeading}><h5>2026年度 予算入力</h5><div><button>CSV</button><button>PDF/印刷</button><button className={styles.primary}>予算を保存</button></div></div>
        <PreviewTable headings={["区分", "科目", "前年度予算", "本年度予算", "増減", "備考"]} rows={[["収入", "会費", "¥120,000", "¥130,000", "+¥10,000", ""], ["支出", "事務費", "¥20,000", "¥25,000", "+¥5,000", ""]]} />
      </>
    );
  }

  if (active === "settlement") {
    return (
      <>
        <div className={styles.metrics}><span><small>会費実績</small><strong>¥130,000</strong></span><span><small>収入実績</small><strong>¥145,000</strong></span><span><small>支出実績</small><strong>¥42,000</strong></span><span><small>収支差額</small><strong>¥103,000</strong></span></div>
        <div className={styles.contentHeading}><div><h5>決算明細入力</h5><p>領収書・明細を登録します。</p></div><button className={styles.primary}>明細を追加</button></div>
        <div className={styles.formGrid}>
          <label><span>区分</span><b>支出</b></label><label><span>科目</span><b>事務費</b></label><label><span>日付</span><b>2026-09-18</b></label><label><span>金額</span><b>5,000</b></label>
        </div>
        <div className={styles.monthlyHeading}>
          <h5>月別 科目別集計</h5>
          <span>2026年度 全期間</span>
        </div>
        <PreviewTable headings={["区分", "科目", "決算額", "明細件数"]} rows={[["収入", "会費", "¥130,000", "12"], ["収入", "補助金", "¥15,000", "1"], ["支出", "事務費", "¥20,000", "4"], ["支出", "印刷費", "¥12,000", "2"]]} />
      </>
    );
  }

  return (
    <>
      <div className={styles.metrics}><span><small>収入計</small><strong>¥145,000</strong></span><span><small>支出計</small><strong>¥42,000</strong></span><span><small>収支差額</small><strong>¥103,000</strong></span><span><small>会費連携</small><strong>¥130,000</strong></span></div>
      <div className={styles.contentHeading}><h5>2026年度 集計</h5><div><button>予算CSV</button><button>決算CSV</button><button>予算PDF/印刷</button><button className={styles.primary}>決算PDF/印刷</button></div></div>
      <PreviewTable headings={["区分", "科目", "予算額", "決算額", "差分"]} rows={[["収入", "会費", "¥130,000", "¥130,000", "¥0"], ["支出", "事務費", "¥25,000", "¥20,000", "¥5,000"]]} />
    </>
  );
}

function PreviewTable({ headings, rows }: { headings: string[]; rows: string[][] }) {
  return (
    <div className={styles.tableWrap}>
      <table><thead><tr>{headings.map((heading) => <th key={heading}>{heading}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{cell || "−"}</td>)}</tr>)}</tbody></table>
    </div>
  );
}

export default function AccountingManualPage() {
  return (
    <ManualAccessGate scope="admin">
      <div className={styles.guide}>
      <OnboardingGuide
        theme="purple"
        audience="町内会・自治会の役員向け"
        audienceIcon="fa-people-roof"
        title="役員管理画面 総会会計編"
        summary="町内会・自治会の会計処理、総会の予算書・決算書作成を行います"
        summaryNormalWeight
        returnHref="/admin"
        returnLabel="管理機能に戻る"
        desktopLayout
        showStepNumbers={false}
        preparation={[]}
        processTitle="総会会計の操作説明"
        processSubtitle=""
        steps={[
          {
            title: "会計年度と年度確定",
            text: "年度始めに「会計科目登録」にて、当年度の科目を決定、予算入力し予算書を作成、会計年度中は会計処理にて収入、支出を登録、総会時に決算書を作成、年度の会計を確定した後、「年度確定」処理を行い、次年度の予算書作成の為に「会計年度」繰り越しを行います。",
            points: ["「年度確定」した場合も代表者が「確定解除」を行うことが可能です。", "「確定解除」は修正後、代表者が「再確定」を行えます"],
            visual: <AssemblyYearScreenPreview />,
          },
          {
            title: "会計科目登録",
            subtitle: "町内会・自治会用の会計科目を登録します",
            text: "町内会・自治会用の収入・支出科目を登録します。登録された科目は総会の予算、決算資料の科目になります。科目は親科目、補助科目で登録します。初期の科目は参考のため作成されてますので、追加、修正、削除して科目を整理してください。",
            points: ["補助科目を追加する場合は、親科目を選択し登録します。"],
            visual: <AccountingScreenPreview active="categories" />,
          },
          {
            title: "予算入力",
            subtitle: "会計年度の科目ごとに予算を入力します",
            text: "会計年度の科目ごとに前年度予算、本年度予算を入力して「予算を保存」を押します。前年度と当年度の増減額が自動計算されます。",
            points: ["予算書はCSV、PDFにて出力可能です。"],
            visual: <AccountingScreenPreview active="budget" />,
          },
          {
            title: "会計処理",
            subtitle: "会計年度の収入・支出明細を登録します",
            text: "会計年度中、収入明細、支出明細を登録し、総会決算書に反映します。支出明細は領収書の画像またはPDFを添付して登録を行い、証票も残します。",
            points: ["会費管理の入金実績は会費実績として自動集計されます。", "登録した明細は全期間、または各会計期間の月毎に表示できます。"],
            visual: <AccountingScreenPreview active="settlement" />,
          },
          {
            title: "総会資料作成",
            subtitle: "予算と決算を集計し、予算書、決算書の総会資料を作成します",
            text: "収入・支出ごとに予算額、決算額を集計します。確認後総会資料として決算書を作成します。年度確定した後、会計年度を繰り越し、会計科目を見直し、総会資料として、次年度の予算書を作成します。予算書、決算書はCSV、PDFで作成できます。",
            visual: <AccountingScreenPreview active="report" />,
          },
        ]}
      />
      </div>
    </ManualAccessGate>
  );
}
