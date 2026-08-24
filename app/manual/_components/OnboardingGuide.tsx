import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ManualSiteHeader } from "./ManualSiteHeader";
import styles from "./OnboardingGuide.module.css";

type Theme = "blue" | "green" | "purple";

type GuideStep = {
  title: string;
  text: string;
  visual: ReactNode;
  points?: string[];
  caution?: string;
  link?: { href: string; label: string };
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
  purple: {
    soft: "bg-[#f0efff]",
    pale: "bg-[#f7f6ff]",
    text: "text-[#635bff]",
    solid: "bg-[#635bff]",
    border: "border-[#d8d5ff]",
    button: "bg-[#635bff]",
    hover: "hover:text-[#635bff]",
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
  processTitle = "画面を見ながら登録する",
  processSubtitle = "実際に表示される画面を使って、操作順に説明します",
  returnHref = "/manual",
  returnLabel = "マニュアル一覧へ戻る",
  desktopLayout = false,
}: {
  theme: Theme;
  audience: string;
  audienceIcon: string;
  title: string;
  summary: string;
  time?: string;
  preparation: Array<{ icon: string; title: string; text: string }>;
  steps: GuideStep[];
  processTitle?: string;
  processSubtitle?: string;
  returnHref?: string;
  returnLabel?: string;
  desktopLayout?: boolean;
}) {
  const colors = themeStyles[theme];

  return (
    <main className="min-h-screen bg-[#f4f9fb] text-[#243746]">
      <ManualSiteHeader backHref={returnHref} backLabel={returnLabel} />

      <section className={`${colors.soft} px-4 py-12 text-center`}>
        <div className="mx-auto max-w-3xl">
          <div className={`mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black ${colors.text}`}>
            <i className={`fas ${audienceIcon}`} aria-hidden="true" />
            {audience}
          </div>
          <h1 className="text-3xl font-black leading-tight text-[#203947] md:text-4xl">{title}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm font-semibold leading-8 text-[#506b78]">{summary}</p>
          {time && (
            <p className="mt-5 text-xs font-black text-[#607b89]">
              <i className="far fa-clock mr-2" aria-hidden="true" />
              所要時間の目安：{time}
            </p>
          )}
        </div>
      </section>

      <article className={`${styles.article} ${desktopLayout ? styles.articleDesktop : ""} space-y-12 px-4 py-12`}>
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

        {steps.length > 0 && (
          <section>
            <SectionTitle title={processTitle} subtitle={processSubtitle} />
            <ol className={`${styles.stepList} ${desktopLayout ? styles.stepListDesktop : ""}`}>
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
                    <h3 className={`${styles.stepTitle} text-xl font-black leading-8 text-[#203947]`}>{step.title}</h3>
                    <p className={`${styles.stepText} mt-4 text-sm font-semibold leading-8 text-[#607b89]`}>{step.text}</p>
                    {step.points && (
                      <ul className={`${styles.pointList} mt-5 space-y-2 text-sm font-bold leading-7 text-[#46606d]`}>
                        {step.points.map((point) => (
                          <li className="flex items-start gap-2" key={point}>
                            <i className={`fas fa-check-circle mt-1.5 ${colors.text}`} aria-hidden="true" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {step.caution && (
                      <p className={`${styles.caution} mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold leading-6 text-amber-900`}>
                        <i className="fas fa-triangle-exclamation mr-2 text-amber-600" aria-hidden="true" />
                        {step.caution}
                      </p>
                    )}
                    {step.link && (
                      <Link href={step.link.href} className={`mt-5 inline-flex items-center rounded-xl border-2 bg-white px-4 py-3 text-sm font-black no-underline ${colors.border} ${colors.text}`}>
                        <i className="fas fa-book-open mr-2" aria-hidden="true" />
                        {step.link.label}
                      </Link>
                    )}
                  </div>
                  <div className={styles.stepVisual}>{step.visual}</div>
                </li>
              );
              })}
            </ol>
          </section>
        )}

      </article>

      <footer className="px-4 pb-14 text-center">
        <Link href={returnHref} className={`${styles.manualListLink} ${colors.hover}`}>
          <i className={`fas ${returnHref === "/admin" ? "fa-arrow-left" : "fa-book-open"} mr-2`} aria-hidden="true" />
          {returnLabel}
        </Link>
      </footer>
    </main>
  );
}

export function ActualScreenImage({
  src,
  alt,
  caption,
  width = 390,
  height = 844,
}: {
  src: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure className={styles.actualScreenFigure}>
      <div className={styles.actualScreenFrame}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
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

export function DesktopScreenPreview({
  src,
  alt,
  caption,
  width = 1265,
  height = 712,
  scroll = false,
  hotspots = [],
}: {
  src: string;
  alt: string;
  caption: string;
  width?: number;
  height?: number;
  scroll?: boolean;
  hotspots?: Array<{ left: string; top: string; label: string; delay?: number }>;
}) {
  return (
    <figure className={styles.desktopScreenFigure}>
      <div className={`${styles.desktopScreenFrame} ${scroll ? styles.desktopScreenScroll : ""}`}>
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          className={scroll ? styles.desktopScreenImageScroll : styles.desktopScreenImage}
        />
        {hotspots.map((hotspot) => (
          <span
            className={styles.desktopScreenHotspot}
            style={{ left: hotspot.left, top: hotspot.top, animationDelay: `${hotspot.delay || 0}s` }}
            key={`${hotspot.label}-${hotspot.left}-${hotspot.top}`}
          >
            <i className="fas fa-hand-pointer" aria-hidden="true" />
            <strong>{hotspot.label}</strong>
          </span>
        ))}
      </div>
      {caption && (
        <figcaption>
          <i className="fas fa-desktop" aria-hidden="true" />
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

export function StripeDesktopPreview({
  focus = "registration",
  caption,
}: {
  focus?: "status" | "registration" | "start" | "paypay";
  caption: string;
}) {
  const focusClass = {
    status: styles.stripeFocusStatus,
    registration: styles.stripeFocusRegistration,
    start: styles.stripeFocusStart,
    paypay: styles.stripeFocusPaypay,
  }[focus];

  return (
    <figure className={styles.stripeWalkthroughFigure}>
      <div className={`${styles.stripeScreenFrame} ${focus === "paypay" ? styles.stripeScreenPaypay : ""}`}>
        <div className={styles.stripeScreenCanvas}>
          <div className={styles.stripeScreenHero}>
            <span><i className="fas fa-arrow-left" aria-hidden="true" /> 管理トップへ戻る</span>
            <div><small>基本機能</small><strong>Stripe連携</strong><em>Connectアカウント、オンボーディング、決済受付状態</em></div>
          </div>
          <div className={styles.stripeScreenTabs}>
            {['基本情報', '会員管理', '会費管理', 'システム利用料', '役員管理', 'Stripe連携'].map((tab) => <span className={tab === 'Stripe連携' ? styles.stripeScreenTabActive : ''} key={tab}>{tab}</span>)}
          </div>
          <div className={styles.stripeScreenGrid}>
            <section className={`${styles.stripeScreenPanel} ${focus === "status" ? focusClass : ""}`}>
              <div className={styles.stripePanelHeading}><strong>Stripe本番連携</strong><b>未連携</b></div>
              <p>町内会・自治会とStripeの個別契約として、本番モードのConnect登録を行います。</p>
              <dl className={styles.stripeStatusList}>
                <div><dt>登録モード</dt><dd>本番モード</dd></div>
                <div><dt>Connectアカウント</dt><dd>未連携</dd></div>
                <div><dt>Stripe登録名</dt><dd>未確認</dd></div>
                <div><dt>入金先口座</dt><dd>未確認</dd></div>
                <div><dt>決済受付</dt><dd>未確認</dd></div>
                <div><dt>入金／振込</dt><dd>未確認</dd></div>
              </dl>
            </section>
            <section className={`${styles.stripeScreenPanel} ${focus === "registration" || focus === "start" ? focusClass : ""}`}>
              <h4>本番Stripe登録を開始</h4>
              <p>Stripeへ移る前に、el-townで団体情報を確認・入力します。</p>
              <div className={styles.stripeFieldGrid}>
                <label><span>団体区分</span><b>非営利団体（町内会）⌄</b></label>
                <label><span>Stripeへ登録する団体名</span><b>エルタウン町内会</b></label>
                <label><span>Stripe連絡先メール</span><b>accounting@example.jp</b></label>
                <label><span>問い合わせ電話番号</span><b>例：03-1234-5678</b></label>
                <label><span>Webサイト</span><b>https://example.jp</b></label>
              </div>
              <label className={styles.stripeServiceField}><span>サービス内容</span><b>町内会費・自治会費のオンライン受付</b></label>
              <div className={styles.stripeChecks}><span>□ 団体区分を確認しました</span><span>□ 代表者の本人確認書類を準備しました</span><span>□ 団体が管理する入金先口座を準備しました</span></div>
              <button className={`${styles.stripePrimaryButton} ${focus === "start" ? styles.stripeButtonFocus : ""}`} type="button">入力内容を確認して本番Stripe登録を開始</button>
              <button className={styles.stripeSecondaryButton} type="button">Stripe状態を更新</button>
            </section>
          </div>
          <section className={`${styles.stripePaypayPanel} ${focus === "paypay" ? focusClass : ""}`}>
            <div className={styles.stripePanelHeading}><strong>団体別オプション　Stripe PayPayの申請</strong><b>未申請</b></div>
            <p>利用する団体だけ申請します。先にStripe Connectの本番登録を完了してください。</p>
            <div className={styles.stripePaypayFlow}><span>1. 団体が入力・申請</span><span>2. el-town運営が確認</span><span>3. 法定ページ公開</span><span>4. Stripe審査</span></div>
            <div className={styles.stripePaypayFields}><span>団体名　エルタウン町内会</span><span>運営責任者　例：会長 山田太郎</span><span>郵便番号　123-4567</span><span>会費名称　年会費</span></div>
          </section>
        </div>
      </div>
      {caption && <figcaption><i className="fas fa-desktop" aria-hidden="true" />{caption}</figcaption>}
    </figure>
  );
}

export function StripeFlowDesktopPreview({ caption }: { caption: string }) {
  return (
    <figure className={styles.pcGuideFigure}>
      <div className={styles.pcGuideFrame}>
        <div className={styles.pcGuideToolbar}><i className="fas fa-lock" aria-hidden="true" /><span>el-town.jp / Stripe連携</span></div>
        <div className={styles.stripeFlowScreen}>
          <div className={styles.stripeFlowTitle}><small>Stripe Connect</small><strong>オンライン会費の流れ</strong><span>カード情報はel-townへ保存されません</span></div>
          <div className={styles.stripeFlowNodes}>
            <div><i className="fas fa-users" /><strong>会員</strong><span>カード・PayPayで支払う</span></div>
            <i className="fas fa-arrow-right" />
            <div className={styles.stripeFlowStripe}><i className="fab fa-stripe-s" /><strong>Stripe</strong><span>決済・本人確認・振込</span></div>
            <i className="fas fa-arrow-right" />
            <div><i className="fas fa-building-columns" /><strong>団体口座</strong><span>売上を受け取る</span></div>
          </div>
          <div className={styles.stripeFlowChecks}><span><i className="fas fa-check" /> 1団体1 Connect account</span><span><i className="fas fa-check" /> 決済受付と入金／振込を確認</span><span><i className="fas fa-check" /> 会費一覧へ自動反映</span></div>
        </div>
      </div>
      <figcaption><i className="fas fa-desktop" aria-hidden="true" />{caption}</figcaption>
    </figure>
  );
}

export function StripeHostedDesktopPreview({
  stage,
  caption,
}: {
  stage: "organization" | "verification";
  caption: string;
}) {
  const verification = stage === "verification";
  return (
    <figure className={styles.pcGuideFigure}>
      <div className={styles.pcGuideFrame}>
        <div className={styles.pcGuideToolbar}><i className="fas fa-lock" aria-hidden="true" /><span>connect.stripe.com</span></div>
        <div className={styles.stripeHostedScreen}>
          <aside><i className="fab fa-stripe-s" /><strong>Stripe</strong><span className={!verification ? styles.pcStepActive : ""}>1　組織情報</span><span className={!verification ? styles.pcStepActive : ""}>2　代表者情報</span><span className={verification ? styles.pcStepActive : ""}>3　本人確認</span><span className={verification ? styles.pcStepActive : ""}>4　入金先口座</span><small>表示項目は登録状況により異なります</small></aside>
          <section>
            <h4>{verification ? "本人確認と入金先口座" : "組織と代表者について"}</h4>
            <p>{verification ? "画面に表示された有効な書類と、団体が管理する口座を登録します。" : "会則・登記資料と本人確認書類に一致する内容を入力します。"}</p>
            {verification ? (
              <div className={styles.stripeHostedCards}>
                <div className={styles.pcFocusPanel}><i className="fas fa-id-card" /><strong>代表者の本人確認</strong><span>書類全体が鮮明に写る画像を提出</span><button type="button">書類を選択</button></div>
                <div><i className="fas fa-building-columns" /><strong>入金先口座</strong><span>金融機関・支店・口座番号・名義</span><button type="button">口座情報を入力</button></div>
              </div>
            ) : (
              <div className={styles.stripeHostedForm}>
                <label><span>事業形態</span><b>非営利団体</b></label><label><span>組織の正式名称</span><b>エルタウン町内会</b></label><label><span>所在地</span><b>会則・確認資料と同じ住所</b></label><label><span>代表者氏名</span><b>本人確認書類と同じ表記</b></label><label><span>生年月日</span><b>年／月／日</b></label><label><span>電話番号</span><b>連絡可能な番号</b></label>
              </div>
            )}
            <button className={styles.stripeHostedContinue} type="button">保存して続ける</button>
          </section>
        </div>
      </div>
      <figcaption><i className="fas fa-desktop" aria-hidden="true" />{caption}</figcaption>
    </figure>
  );
}

export function FeeSettingsDesktopPreview({ caption }: { caption: string }) {
  return (
    <figure className={styles.pcGuideFigure}>
      <div className={styles.pcGuideFrame}>
        <div className={styles.pcGuideToolbar}><i className="fas fa-lock" aria-hidden="true" /><span>el-town.jp / 管理画面 / 会費管理</span></div>
        <div className={styles.feeDesktopScreen}>
          <header><small>基本機能</small><strong>会費管理</strong><span>会費設定、請求額、入金状況、手集金</span></header>
          <nav>{['基本情報', '会員管理', '会費管理', 'システム利用料', '役員管理', 'Stripe連携'].map((tab) => <span className={tab === '会費管理' ? styles.pcTabActive : ''} key={tab}>{tab}</span>)}</nav>
          <div className={styles.feeDesktopGrid}>
            <section className={styles.pcFocusPanel}><h4>会費・決済方法の個別設定</h4><div className={styles.feeDesktopFields}><span>会費名称　年会費</span><span>標準会費額　5,000円</span><span>年度開始月　4月</span></div><div className={styles.feeDesktopMethods}><b>☑ 手集金</b><b className={styles.feeDesktopStripe}>☑ Stripeカード決済</b><b>□ 口座振込</b></div><button type="button">この団体の設定を保存</button></section>
            <section><h4>会費請求設定</h4><div className={styles.feeDesktopFields}><span>会計年度　2026年度</span><span>会費請求額　5,000円</span><span>請求対象　全会員世帯</span></div><div className={styles.feeDesktopActions}><button type="button">請求額を設定</button><button type="button">Stripe請求に設定</button></div><small>PayPayは団体の申請・審査完了後にStripe決済画面へ自動表示されます。</small></section>
          </div>
        </div>
      </div>
      <figcaption><i className="fas fa-desktop" aria-hidden="true" />{caption}</figcaption>
    </figure>
  );
}

export function MemberPaymentDesktopPreview({ caption }: { caption: string }) {
  return (
    <figure className={styles.pcGuideFigure}>
      <div className={styles.pcGuideFrame}>
        <div className={styles.pcGuideToolbar}><i className="fas fa-lock" aria-hidden="true" /><span>el-town.jp / 会員画面 / 会費</span></div>
        <div className={styles.memberPaymentDesktop}>
          <aside><strong>エルタウン町内会</strong><span>回覧板</span><span className={styles.pcStepActive}>会費</span><span>Live</span><span>設定</span></aside>
          <section><small>会費</small><h4>2026年度</h4><p>この会費は世帯共通です。世帯主または家族が支払うと全員へ反映されます。</p><div className={styles.memberFeeSummary}><span><small>請求額</small><strong>5,000円</strong></span><span><small>入金額</small><strong>0円</strong></span><span><small>状態</small><strong>未納</strong></span></div><div className={styles.memberPaymentMethods}><span><i className="fas fa-hand-holding-yen" /> 手集金</span><button className={styles.pcFocusPanel} type="button"><i className="fas fa-credit-card" /> オンラインで支払う（カード・PayPay）</button><small>PayPayはStripeの安全な決済画面で選択できます。</small><a>お支払い条件・特定商取引法に基づく表記</a></div></section>
        </div>
      </div>
      <figcaption><i className="fas fa-desktop" aria-hidden="true" />{caption}</figcaption>
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
      <figcaption>LINEでの読み取り手順（図のQRコードは読み取りできません）</figcaption>
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
