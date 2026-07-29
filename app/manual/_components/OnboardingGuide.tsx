import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./OnboardingGuide.module.css";

type Theme = "blue" | "green";

type GuideStep = {
  title: string;
  text: string;
  visual: ReactNode;
};

type FieldItem = {
  label: string;
  value: string;
};

const themeStyles = {
  blue: {
    soft: "bg-[#e8f7fb]",
    pale: "bg-[#f1fbfe]",
    text: "text-[#118bb3]",
    solid: "bg-[#118bb3]",
    border: "border-[#bfe2ee]",
    button: "bg-[#118bb3]",
    hover: "hover:text-[#118bb3]",
  },
  green: {
    soft: "bg-[#edf8f1]",
    pale: "bg-[#f3fbf6]",
    text: "text-[#168a51]",
    solid: "bg-[#168a51]",
    border: "border-[#bfe4ce]",
    button: "bg-[#168a51]",
    hover: "hover:text-[#168a51]",
  },
};

export function OnboardingGuide({
  theme,
  audience,
  audienceIcon,
  title,
  summary,
  time,
  preparation,
  steps,
  fields,
  fieldNote,
  troubleItems,
}: {
  theme: Theme;
  audience: string;
  audienceIcon: string;
  title: string;
  summary: string;
  time: string;
  preparation: Array<{ icon: string; title: string; text: string }>;
  steps: GuideStep[];
  fields: FieldItem[];
  fieldNote?: string;
  troubleItems: string[];
}) {
  const colors = themeStyles[theme];

  return (
    <main className="min-h-screen bg-[#f4f9fb] text-[#243746]">
      <header className="border-b border-[#dce8ed] bg-white">
        <div className={`${styles.headerInner} px-4 py-4`}>
          <Link
            href="/manual"
            className={`justify-self-start text-sm font-black text-[#607b89] no-underline ${colors.hover}`}
          >
            <i className="fas fa-chevron-left mr-2" aria-hidden="true" />
            <span className="hidden sm:inline">マニュアル一覧</span>
          </Link>
          <Image
            src="/assets/logo_horizontal_final.png"
            alt="el-town"
            width={150}
            height={40}
            className="h-auto w-[135px]"
            priority
          />
          <span aria-hidden="true" />
        </div>
      </header>

      <section className={`${colors.soft} px-4 py-12 text-center`}>
        <div className="mx-auto max-w-3xl">
          <div className={`mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black ${colors.text}`}>
            <i className={`fas ${audienceIcon}`} aria-hidden="true" />
            {audience}
          </div>
          <h1 className="text-3xl font-black leading-tight text-[#203947] md:text-4xl">{title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-semibold leading-8 text-[#506b78]">{summary}</p>
          <p className="mt-5 text-xs font-black text-[#607b89]">
            <i className="far fa-clock mr-2" aria-hidden="true" />
            所要時間の目安：{time}
          </p>
        </div>
      </section>

      <article className={`${styles.article} space-y-12 px-4 py-12`}>
        <section className="text-center">
          <SectionTitle title="始める前に用意するもの" />
          <div className={styles.preparationGrid}>
            {preparation.map((item) => (
              <div
                className={`flex min-h-44 flex-col items-center justify-center rounded-3xl border ${colors.border} ${colors.pale} p-6`}
                key={item.title}
              >
                <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-white text-lg ${colors.text}`}>
                  <i className={item.icon} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-black text-[#203947]">{item.title}</h3>
                <p className="mt-2 text-xs font-semibold leading-6 text-[#607b89]">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle title="画面を見ながら登録する" subtitle="実際の操作順に、画面イメージと一緒に説明します" />
          <ol className={styles.stepList}>
            {steps.map((step, index) => {
              const visualFirst = index % 2 === 1;
              return (
                <li
                  key={step.title}
                  className={`${styles.stepCard} ${visualFirst ? styles.stepCardReverse : ""} rounded-[2rem] border border-[#dce8ed] bg-white p-6 shadow-[0_12px_40px_rgba(33,78,98,.07)] md:p-9`}
                >
                  <div className={styles.stepCopy}>
                    <div className={`mb-4 inline-grid h-10 w-10 place-items-center rounded-full text-sm font-black text-white ${colors.solid}`}>
                      {index + 1}
                    </div>
                    <h3 className="text-xl font-black leading-8 text-[#203947]">{step.title}</h3>
                    <p className="mt-4 text-sm font-semibold leading-8 text-[#607b89]">{step.text}</p>
                  </div>
                  <div className={styles.stepVisual}>{step.visual}</div>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="rounded-[2rem] border border-[#dce8ed] bg-white p-6 text-center shadow-[0_12px_40px_rgba(33,78,98,.06)] md:p-9">
          <SectionTitle title="入力項目と記入例" />
          <div className="mx-auto mt-7 max-w-3xl overflow-hidden rounded-2xl border border-[#dce8ed] text-left">
            {fields.map((item) => (
              <div
                key={item.label}
                className="grid gap-1 border-b border-[#e5eef2] bg-white p-4 last:border-b-0 md:grid-cols-[220px_1fr]"
              >
                <span className="text-sm font-black text-[#203947]">{item.label}</span>
                <span className="text-sm font-semibold text-[#607b89]">{item.value}</span>
              </div>
            ))}
          </div>
          {fieldNote && <p className="mx-auto mt-5 max-w-3xl text-xs font-semibold leading-6 text-[#718792]">{fieldNote}</p>}
        </section>

        <section className="rounded-[2rem] border border-[#dce8ed] bg-white p-6 text-center shadow-[0_12px_40px_rgba(33,78,98,.06)] md:p-9">
          <SectionTitle title="登録できないとき" />
          <ul className="mx-auto mt-7 max-w-3xl space-y-3 text-left text-sm font-semibold leading-7 text-[#506b78]">
            {troubleItems.map((item) => (
              <li key={item} className="flex gap-3 rounded-2xl bg-[#f7fafb] p-4">
                <i className={`fas fa-circle-info mt-1 ${colors.text}`} aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      </article>

      <footer className="pb-14 text-center">
        <Link href="/manual" className={`text-sm font-black text-[#607b89] no-underline ${colors.hover}`}>
          <i className="fas fa-book-open mr-2" aria-hidden="true" />
          マニュアル一覧へ戻る
        </Link>
      </footer>
    </main>
  );
}

export function ActualScreenImage({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption: string;
}) {
  return (
    <figure className={styles.actualScreenFigure}>
      <div className={styles.actualScreenFrame}>
        <Image
          src={src}
          alt={alt}
          width={390}
          height={844}
          className={styles.actualScreenImage}
        />
      </div>
      <figcaption className="mt-3 text-center text-[11px] font-black text-[#607b89]">
        <i className="fas fa-camera mr-2" aria-hidden="true" />
        {caption}
      </figcaption>
    </figure>
  );
}

export function AnimatedAction({
  theme,
  icon,
  title,
  text,
  action,
}: {
  theme: Theme;
  icon: string;
  title: string;
  text: string;
  action: string;
}) {
  const colors = themeStyles[theme];
  return (
    <div className={`${styles.animatedAction} ${colors.pale} ${colors.border}`}>
      <span className={`${styles.animatedActionIcon} ${colors.soft} ${colors.text}`}>
        <i className={icon} aria-hidden="true" />
      </span>
      <h4>{title}</h4>
      <p>{text}</p>
      <div className={`${styles.animatedActionButton} ${colors.button}`}>
        {action}
        <span className={styles.tapIndicator}>
          <i className="fas fa-hand-pointer" aria-hidden="true" />
        </span>
      </div>
      <p className={styles.animationCaption}>操作イメージ</p>
    </div>
  );
}

export function QrLineScanVisual() {
  const qrPattern = [
    "11111110101111111",
    "10000010101000001",
    "10111010101011101",
    "10111010001011101",
    "10111010111011101",
    "10000010001000001",
    "11111110101111111",
    "00000000100000000",
    "11010111101101011",
    "00101100110110100",
    "11110111001101111",
    "00000000111010010",
    "11111110101110111",
    "10000010011010100",
    "10111010101111101",
    "10000010110000110",
    "11111110101110111",
  ].join("");

  return (
    <figure className={styles.qrLineFigure}>
      <div className={styles.qrLinePhone}>
        <div className={styles.qrLineHeader}>
          <i className="fab fa-line" aria-hidden="true" />
          <strong>LINEでQRコードを読み取る</strong>
        </div>
        <div className={styles.qrScanner}>
          <div className={styles.qrCode} aria-hidden="true">
            {Array.from(qrPattern).map((cell, index) => (
              <span className={cell === "1" ? styles.qrCellDark : ""} key={index} />
            ))}
          </div>
          <span className={styles.qrScanLine} aria-hidden="true" />
          <span className={`${styles.qrCorner} ${styles.qrCornerTopLeft}`} aria-hidden="true" />
          <span className={`${styles.qrCorner} ${styles.qrCornerTopRight}`} aria-hidden="true" />
          <span className={`${styles.qrCorner} ${styles.qrCornerBottomLeft}`} aria-hidden="true" />
          <span className={`${styles.qrCorner} ${styles.qrCornerBottomRight}`} aria-hidden="true" />
        </div>
        <div className={styles.qrLineResult}>
          <i className="fas fa-check-circle" aria-hidden="true" />
          el-townの会員登録画面を開きます
        </div>
      </div>
      <figcaption>操作イメージ（この図のQRコードは読み取り用ではありません）</figcaption>
    </figure>
  );
}

export function AnimatedFormPreview({
  theme,
  title,
  fields,
  action,
}: {
  theme: Theme;
  title: string;
  fields: Array<{ label: string; value: string; type?: "input" | "select" | "password" }>;
  action?: string;
}) {
  const colors = themeStyles[theme];

  return (
    <figure className={styles.formPreviewFigure}>
      <div className={styles.formPreviewScreen}>
        <div className={styles.formPreviewBrand}>
          <Image src="/assets/logo_horizontal_final.png" alt="el-town" width={132} height={35} />
          <strong>{title}</strong>
        </div>
        <div className={styles.formPreviewFields}>
          {fields.map((field, index) => (
            <div className={styles.formPreviewField} key={field.label} style={{ animationDelay: `${index * 0.45}s` }}>
              <span>{field.label}</span>
              <div className={field.type === "select" ? styles.formPreviewSelect : ""}>
                {field.type === "password" ? "••••••••••••" : field.value}
                {field.type === "select" && <i className="fas fa-chevron-down" aria-hidden="true" />}
              </div>
            </div>
          ))}
        </div>
        {action && (
          <div className={`${styles.formPreviewAction} ${colors.button}`}>
            <i className="fas fa-check" aria-hidden="true" />
            {action}
            <span className={styles.tapIndicator}>
              <i className="fas fa-hand-pointer" aria-hidden="true" />
            </span>
          </div>
        )}
      </div>
      <figcaption>実際の入力項目に合わせた操作イメージ</figcaption>
    </figure>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center">
      <h2 className="text-2xl font-black text-[#203947]">{title}</h2>
      {subtitle && <p className="mt-3 text-sm font-semibold text-[#718792]">{subtitle}</p>}
    </div>
  );
}
