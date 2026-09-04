import type { Metadata } from "next";
import {
  DesktopScreenPreview,
  OnboardingGuide,
  StripeDesktopPreview,
} from "../_components/OnboardingGuide";
import { ManualAccessGate } from "../_components/ManualAccess";

export const metadata: Metadata = {
  title: "役員管理画面 基本機能編 | el-town オンラインマニュアル",
  description: "役員管理画面を利用する前に用意するものを確認します。",
};

export default function AdminManualPage() {
  return (
    <ManualAccessGate scope="admin">
      <OnboardingGuide
        theme="blue"
        audience="町内会・自治会の役員向け"
        audienceIcon="fa-people-roof"
        title="役員管理画面 基本機能編"
        summary="役員管理画面を利用する前に用意するものを確認します。"
        returnHref="/admin"
        returnLabel="管理機能に戻る"
        desktopLayout
        preparation={[
          { icon: "fas fa-mobile-screen-button", title: "スマホまたはパソコン", text: "役員アカウントで管理画面を開ける端末" },
          { icon: "fas fa-address-book", title: "町内会・自治会の情報", text: "町内会・自治会の決算情報や会員名簿、会費、予算や決算情報など" },
        ]}
        processTitle="各管理機能の操作説明"
        processSubtitle=""
        steps={[
          {
            title: "「基本機能」を押下する",
            text: "「基本機能」は基本情報、会員管理、役員管理、会費管理、システム利用料、Stripe連携が表示されるため、操作したい項目の「開く」を押下してください。",
            points: [
              "画面上部の町内会・自治会名をご確認してください。",
              "複数の町内会・自治会を管理している役員の場合は、作業前に該当の町内会・自治会に切り替えます。",
            ],
            visual: (
              <DesktopScreenPreview
                src="/manual/screens/admin-basic/01-basic-menu.png"
                alt="管理トップの基本機能メニュー"
                caption=""
                width={1264}
                height={1026}
                hotspots={[{ left: "14%", top: "35%", label: "基本機能を開く" }]}
              />
            ),
          },
          {
            title: "基本情報を設定する",
            text: "町内会・自治会の決算月を入力します。決算月は会費年度や会計の予算・決算に使われるため必ず設定してください。また、町内会・自治会の正式名称や会員世帯数、郵便番号も再度確認して、よろしければ「保存して反映」を押下します。",
            points: [
              "決算月の変更は会費管理や会計の対象年度に影響します。締め処理についてはマニュアルを確認してください。",
            ],
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/02-basic-info.png" alt="基本情報のPC管理画面" caption="" width={1664} height={922} hotspots={[{ left: "69%", top: "46%", label: "保存して反映" }]} />,
          },
          {
            title: "会員管理にて会員名簿を管理",
            text: "会員がLineから世帯情報を照合しel-townを利用するため、町内会・自治会の会員名簿をCSV取込みで取込んでおきます。取込みする会員名簿CSVの項目はCSV出力し確認してください。郵便番号、住所２は番地まで、住所３はアパート・マンション名部屋番号とし作成してください。家族は世帯主の情報で登録が可能となりますので、Lineから登録になります。家族は特に退会などの希望がなければそのまま名簿に記載のままにしてください。",
            points: [
              "連携数には、現在の世帯数、世帯主の接続数、家族接続数が表示されます。本人または家族がLINE連携した数をシステム利用料の対象として数えます。",
              "会員一覧は、退会申請、退会済み、氏名、郵便番号、住所２、住所３で検索できます。",
              "退会承認を行うとその世帯のLINE連携が解除されます。転居などを確認後承認してください。",
              "退会済みの世帯または家族は、役員が会員一覧の「復帰」を押すと利用可能な状態へ戻せます。退会時に解除されたLINE連携は自動では戻らないため、復帰後に本人または家族がLINEから会員名簿との照合をやり直してください。",
            ],
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/03-member-management.png" alt="会員管理のPC管理画面" caption="" hotspots={[{ left: "10%", top: "55%", label: "会員を登録" }, { left: "68%", top: "69%", label: "一覧を確認", delay: 1.2 }]} />,
          },
          {
            title: "役員管理",
            subtitle: "役員登録のため招待、退会登録",
            text: "役員名、メールアドレス、役職を入力し、「招待メールを送信」を押します。役員にメールが通知され招待URLからログインが可能となり、ログインすると役員に追加されます。",
            points: [
              "招待URLの有効期限は発行から7日間です。期限切れの場合は再送します。",
              "複数の町内会・自治会へ参加する役員は、同じメールアドレスとパスワードで町内会・自治会を切り替えられます。",
              "最後の管理者は退任できません。先に別の役員の登録してから担当を退任させてください。",
            ],
            copyFirst: true,
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/06-admin-management.png" alt="役員管理のPC管理画面" caption="" hotspots={[{ left: "15%", top: "62%", label: "招待メールを送信" }, { left: "65%", top: "55%", label: "在任・招待・退任", delay: 1.2 }]} />,
          },
          {
            title: "会費の請求と入金を管理する",
            text: "会費名称、標準額、会員向け案内、受取方法を設定します。会計年度は基本情報の決算月から自動計算されます。その後、対象年度と会員を選び、請求額を設定します。前年度が未確定でも次年度の請求を作成できます。現金は「手集金を修正」から入力し、Stripe決済は完了後に自動反映されます。",
            points: [
              "全世帯への一括設定と、選択した会員だけへの設定を使い分けます。",
              "一覧では請求額、手集金、Stripe入金、未入金額を別々に確認できます。",
              "退会済み会員の過去の会費記録も年度集計に残ります。",
            ],
            caution: "会費設定を変更しても、作成済みの請求や入金実績は自動変更されません。金額・年度・対象者を請求前に確認してください。",
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/04-fee-management.png" alt="会費管理のPC管理画面" caption="" hotspots={[{ left: "12%", top: "52%", label: "会費設定" }, { left: "62%", top: "70%", label: "請求・入金一覧", delay: 1.2 }]} />,
          },
          {
            title: "総会会計を年度確定する",
            text: "総会会計で科目、予算、決算明細、会費連携額を確認し、「年度を確定」を押します。確定時点のデータが固定保存され、予算や決算明細を変更できなくなります。",
            points: [
              "確定後の決算書は、科目や会費データが後から変わっても確定時点の内容で表示されます。",
              "訂正が必要な場合は代表者またはシステム権限者が理由を入力して確定を解除します。",
              "確定解除中は代表者またはシステム権限者だけが固定化した年度データを訂正でき、訂正後は再確定します。",
            ],
            caution: "年度確定前に、収入・支出・領収書・会費連携額を確認してください。確定解除と訂正内容は履歴に記録されます。",
            visual: (
              <div style={{ padding: "28px", borderRadius: "18px", background: "#f0f7fb", border: "1px solid #c9e4f2" }}>
                <p style={{ margin: 0, color: "#087ca7", fontWeight: 800 }}>未確定</p>
                <h3 style={{ margin: "8px 0" }}>2026年度の総会会計</h3>
                <p style={{ margin: "0 0 18px", color: "#526577" }}>科目・予算・決算明細・会費連携額を確認して固定保存します。</p>
                <span style={{ display: "inline-block", padding: "10px 18px", borderRadius: "10px", background: "#087ca7", color: "white", fontWeight: 800 }}>🔒 年度を確定</span>
              </div>
            ),
          },
          {
            title: "システム利用料を確認する",
            text: "支払い方法を選び、当月のLINE接続世帯数、無料プッシュ枠、超過配信数、税込請求見込みを確認します。月別請求一覧では請求日、金額、入金状態を確認し、入金後に領収書を出力できます。",
            points: [
              "カード自動決済は初回登録後、原則として毎月1日に処理されます。",
              "Stripe銀行振込を選ぶと、町内会・自治会専用の振込先が請求書に表示されます。",
              "料金対象世帯数は会員管理のLINE連携状況から確認できます。",
            ],
            caution: "支払い方法が未選択のままでは自動決済されません。運用開始前にカードまたは銀行振込を選択してください。",
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/05-system-fee.png" alt="システム利用料のPC管理画面" caption="" hotspots={[{ left: "20%", top: "53%", label: "支払い方法" }, { left: "66%", top: "54%", label: "請求見込み", delay: 1.2 }]} />,
          },
          {
            title: "Stripe連携を開始・確認する",
            text: "オンライン会費を受け取る場合に使います。組織区分、連絡先、Webサイト、サービス内容を入力し、本人確認書類と町内会・自治会が管理する口座を準備してStripeの登録画面へ進みます。戻った後は「Stripe状態を更新」を押し、決済受付と入金・振込が有効か確認します。",
            points: [
              "代表者情報、本人確認書類、銀行口座はStripeの安全な画面へ直接入力します。",
              "本番登録が完了してから、会費管理でStripeカード決済を有効にします。",
              "追加入力が表示された場合はStripe画面で不足項目を完了します。",
            ],
            caution: "本人確認書類、銀行口座、カード情報、パスワードをel-townの問い合わせやAIヘルプへ送らないでください。",
            link: { href: "/manual/stripe", label: "Stripe連携の詳しい別冊マニュアルを開く" },
            visual: <StripeDesktopPreview focus="registration" caption="" />,
          },
        ]}
      />
    </ManualAccessGate>
  );
}
