import type { Metadata } from "next";
import {
  DesktopScreenPreview,
  OnboardingGuide,
  StripeDesktopPreview,
} from "../_components/OnboardingGuide";
import { ManualAccessGate } from "../_components/ManualAccess";

export const metadata: Metadata = {
  title: "役員管理画面 基本機能編 | el-town オンラインマニュアル",
  description: "役員管理画面の各管理機能の操作方法を確認します。",
};

export default function AdminManualPage() {
  return (
    <ManualAccessGate scope="admin">
      <OnboardingGuide
        theme="blue"
        audience="町内会・自治会の役員向け"
        audienceIcon="fa-people-roof"
        title="役員管理画面 基本機能編"
        summary="役員管理画面の各管理機能の操作方法を確認します。"
        returnHref="/admin"
        returnLabel="管理機能に戻る"
        desktopLayout
        preparation={[]}
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
            title: "基本情報",
            subtitle: "町内会・自治会の基本情報登録",
            text: "町内会・自治会の決算月を入力します。決算月は会費年度や会計の予算・決算に使われるため必ず設定してください。また、町内会・自治会の正式名称や会員世帯数、郵便番号も再度確認して、よろしければ「保存して反映」を押下します。",
            points: [
              "決算月の変更は会費管理や会計の対象年度に影響します。締め処理についてはマニュアルを確認してください。",
            ],
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/02-basic-info.png" alt="基本情報のPC管理画面" caption="" width={1664} height={922} hotspots={[{ left: "69%", top: "46%", label: "保存して反映" }]} />,
          },
          {
            title: "会員管理",
            subtitle: "会員のLine連携のため会員名簿の登録",
            text: "会員がLineから世帯情報を照合しel-townを利用するため、町内会・自治会の会員名簿をCSV取込みで取込んでおきます。取込みする会員名簿CSVの項目はCSV出力し確認してください。郵便番号、住所２は番地まで、住所３はアパート・マンション名部屋番号とし作成してください。家族は世帯主の情報で登録が可能となりますので、Lineから登録になります。家族は特に退会などの希望がなければそのまま名簿に記載のままにしてください。",
            points: [
              "連携数には、現在の世帯数、世帯主の接続数、家族接続数が表示されます。本人または家族がLINE連携した数をシステム利用料の対象として数えます。",
              "会員一覧は、退会申請、退会済み、氏名、郵便番号、住所２、住所３で検索できます。",
              "退会承認を行うとその世帯のLINE連携が解除されます。転居などを確認後承認してください。",
              "役員は、退会申請の承認または会員一覧の「退会」から世帯を退会にできます。退会時は本人と家族のLINE連携が解除されます。退会済みの世帯または家族は「復活」で利用可能な状態へ戻せます。LINE連携は自動では戻らないため、復活後に本人または家族がLINEから会員名簿との照合をやり直してください。",
            ],
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/03-member-management.png" alt="会員管理のPC管理画面" caption="" hotspots={[{ left: "10%", top: "55%", label: "会員を登録" }, { left: "68%", top: "69%", label: "一覧を確認", delay: 1.2 }]} />,
          },
          {
            title: "役員管理",
            subtitle: "役員登録のため招待、退会・登録",
            text: "役員名、メールアドレス、役職を入力し、「招待メールを送信」を押します。役員にメールが通知され招待URLからログインが可能となり、ログインすると役員に追加されます。役員改選で役員が退任する場合は退任処理を行えばログインできなくなります。退任した役員を復活させることも可能です。",
            points: [
              "招待URLの有効期限は発行から7日間です。期限切れの場合は再度送信してください",
              "複数の町内会・自治会へ参加する役員は、同じメールアドレスとパスワードで町内会・自治会を切り替えられます。",
              "役員改選時など役員を入れ替えする場合、最低１名は退任できません。先に別の役員の登録した後、退任させてください。",
            ],
            copyFirst: true,
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/06-admin-management.png" alt="役員管理のPC管理画面" caption="" hotspots={[{ left: "15%", top: "62%", label: "招待メールを送信" }, { left: "65%", top: "55%", label: "在任・招待・退任", delay: 1.2 }]} />,
          },
          {
            title: "会費管理",
            fullWidthVisual: true,
            subtitle: "会員への会費請求登録",
            text: "会費請求設定にて対象年度、請求額を入力し、対象会員を選び、「請求額を設定」を押下すると会員に会費が設定されます。会費は「全会員世帯」「会費一覧で選択」で個別設定し、追加された会員は「請求未設定」を選んで設定してください。「会費の支払方法」で手集金・Stripeカード決済・Stripe銀行振込を選び、「支払方法を保存」を押します。銀行振込はStripeの利用審査完了後に利用できます。オンラインで支払われた会費は入金確定後にStripe入金へ自動反映されます。",
            points: [
              "銀行振込先は会員世帯ごとにStripeが発行します。従来の町内会・自治会の銀行口座を入力する設定はありません。",
              "振込の手続き完了だけでは入金済みになりません。不足額がある場合はStripeの支払案内を確認してください。",
              "退会済み会員の会費実績も集計されます。",
              "入金済みの請求や入金実績は、会費請求設定を行っても自動変更されません。",
            ],
            additionalSection: {
              title: "年度を確定した場合",
              text: "会費の入金実績は、対象年度の総会資料へ自動集計されます。「年度を確定」を押すと、その年度の会費データを保存します。総会資料の実績を保存するには、別途、総会会計の年度確定を行ってください。前年度が未確定でも次年度の請求を作成できます。",
              points: [
                "確定後、会費実績の訂正が必要な場合は代表者が理由を入力して確定を解除、その後再確定可能です。",
                "確定解除後は、役員が会費データを修正できます。",
              ],
            },
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/04-fee-management-20260906.png" alt="現在の会費管理画面：年度確定、年度集計、会費請求設定、会費一覧" caption="" width={1177} height={1337} />,
          },
          {
            title: "システム利用料",
            fullWidthVisual: true,
            subtitle: "el-town利用料の支払、請求履歴",
            text: "Stripeのクレジットカード自動決済または銀行振込を選びます。毎月のご利用料金のご請求書、ご入金受領後の領収書を出力できます。",
            points: [
              "カード自動決済は初回登録後、原則として毎月1日に処理されます。",
              "Stripe銀行振込：請求書に記載された振込先へ、記載の支払期限までにお振り込みください。通常は翌月10日が期限です。",
              "el-town利用接続数は会員管理の接続数から確認できます。",
            ],
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/05-system-fee-20260912-stripe-bank.jpg" alt="システム利用料のお支払方法と月別請求一覧の画面例" caption="画面例（サンプルデータ）" width={1264} height={859} crop={{ left: 105, top: 8, width: 635, height: 535 }} />,
          },
          {
            title: "Stripe連携を開始・確認する",
            text: "オンライン会費を受け取る場合に使います。組織区分、連絡先、Webサイト、サービス内容を入力し、本人確認書類と町内会・自治会が管理する口座を準備してStripeの登録画面へ進みます。戻った後は「Stripe状態を更新」を押し、決済受付と入金・振込が有効か確認します。",
            points: [
              "代表者情報、本人確認書類、銀行口座はStripeの安全な画面へ直接入力します。",
              "本番登録が完了してから、会費管理でStripeカード決済・Stripe銀行振込を選択して保存します。銀行振込は追加の利用審査が必要な場合があります。",
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
