import type { Metadata } from "next";
import {
  FeeSettingsDesktopPreview,
  MemberPaymentDesktopPreview,
  OnboardingGuide,
  StripeDesktopPreview,
  StripeFlowDesktopPreview,
  StripeHostedDesktopPreview,
} from "../_components/OnboardingGuide";
import { ManualAccessGate } from "../_components/ManualAccess";

export const metadata: Metadata = {
  title: "Stripe連携の登録のし方 | el-town オンラインマニュアル",
  description: "最新のPC画面で、Stripe本番登録、カード・PayPay決済、会費の入金確認までを説明します。",
};

export default function StripeManualPage() {
  return (
    <ManualAccessGate>
      <OnboardingGuide
        theme="purple"
        audience="町内会・自治会の役員向け"
        audienceIcon="fa-credit-card"
        title="Stripe連携の登録のし方"
        summary=""
        processTitle="本番登録から会費の入金確認まで"
        processSubtitle=""
        returnHref="/manual/admin"
        returnLabel="基本機能編ヘルプに戻る"
        desktopLayout
        preparation={[]}
        steps={[
          {
            title: "Stripe連携でできることを確認する",
            text: <>Stripeは、町内会・自治会の会員がオンライン決済にて会費を支払うための決済基盤です。契約主体は町内会・自治会とStripeになります。el-townはオンライン決済のプラットフォームであるStripeの利用を標準で提供します。<strong>会員は町内会・自治会がStripeと契約した場合、オンライン決済が可能となり、クレジットカードや口座振込、PayPay（オプション）にて決済可能となります。</strong></>,
            points: [
              "クレジットカード情報はel-townへ保存されません。",
              "el-townの会費一覧で、手入金とStripe入金を分けて確認できます。",
            ],
            caution: "Stripeのパスワード、確認コード、カード番号、本人確認書類の画像を、el-townの問い合わせやAIヘルプへ送らないでください。",
            visual: <StripeFlowDesktopPreview />,
          },
          {
            title: "Stripe画面入力前にel-town画面に設定項目を入力する",
            text: "組織区分は便宜的に「個人」を選択してください、他の「非営利団体」等を選んだ場合登録が難しくなります。町内会・自治会名、メールアドレス、電話番号、webサイト、サービス内容を入力します。町内会・自治会でwebサイトをお持ちでない場合は、el-town.jpをご登録下さい。",
            visual: <StripeDesktopPreview focus="registration" />,
          },
          {
            title: "3つチェック項目確認後にStripe画面にて登録を開始する",
            text: "「規約・登記上の組織区分」「代表者の本人確認書類」「町内会・自治会が管理する入金先口座」の3項目を実際に準備できた場合にチェックします。その後「入力内容を確認してStripe登録を開始」を押すと、別画面でStripeの登録が始まります。",
            points: [
              "新しい画面が開かない場合は、ブラウザのポップアップ制限を確認してもう一度押します。",
              "途中で閉じても「本番登録を再開・確認」から続きへ戻れます。",
            ],
            visual: <StripeDesktopPreview focus="start" />,
          },
          {
            title: "Stripeで組織と代表者情報を入力する",
            text: "Stripeの案内に従い、組織形態、所在地、代表者の氏名、生年月日、住所、連絡先などを入力します。氏名や住所は本人確認書類の表記と一致させ、略字・旧住所・入力漏れがないか確認してください。",
            points: [
              "画面に表示される必須項目はすべて入力します。",
              "代表者が変更されている場合は、現在の代表者と町内会・自治会内の承認状況を確認します。",
              "入力内容の確認画面で誤字、番地、電話番号を見直します。",
            ],
            caution: "Stripeが求める項目は組織区分や確認状況により異なります。このマニュアルにない項目が出た場合は、画面の最新案内を優先してください。",
            visual: <StripeHostedDesktopPreview stage="organization" />,
          },
          {
            title: "本人確認書類と入金先口座を登録する",
            text: "Stripe画面で指定された本人確認書類を撮影またはアップロードし、町内会・自治会が管理する銀行口座を登録します。書類全体が明るく鮮明で、四隅と文字が読み取れることを確認してください。",
            points: [
              "口座名義、金融機関、支店、口座種別、番号を通帳などと照合します。",
              "アップロード後に追加撮影や別書類を求められた場合は画面の案内に従います。",
              "登録完了画面が表示されるまでブラウザの戻る操作を避けます。",
            ],
            caution: "本人確認書類と口座情報は必ずStripe画面へ直接入力します。スクリーンショットをメールやチャットへ添付しないでください。",
            visual: <StripeHostedDesktopPreview stage="verification" />,
          },
          {
            title: "el-townへ戻り「Stripe状態を更新」する",
            text: "Stripeで入力を終えてel-townへ戻ったら、「Stripe状態を更新」を押します。Connectアカウント、Stripe登録名、入金先口座末尾、決済受付、入金／振込の表示を確認します。",
            points: [
              "状態が「有効」で、「決済受付：有効」「入金/振込：有効」なら会費請求へ進めます。",
              "「追加入力が必要」と表示された場合は「本番登録を再開・確認」からStripeへ戻ります。",
              "審査中の場合は時間を置き、Stripeからのメールを確認してから再更新します。",
            ],
            caution: "登録画面を完了しただけでは、決済受付と入金が有効になっていない場合があります。2項目の「有効」を必ず確認してください。",
            visual: <StripeDesktopPreview focus="status" />,
          },
          {
            title: "会費管理で請求額を設定する",
            text: "Stripe連携が有効になったら「基本機能」→「会費管理」を開き、Stripeの状態が「有効」であることを確認します。その後、会計年度、請求額、対象者を確認し「請求額を設定」を押します。「会費の支払方法」で手集金・Stripeカード決済・Stripe銀行振込を選択し、保存します。銀行振込はStripeの利用審査完了後に利用できます。会員は支払画面で利用可能な決済方法を選びます。Stripe銀行振込では会員世帯ごとの専用口座が案内され、入金確定後に自動消込されます。",
            points: [
              "Stripe専用の請求ボタンはありません。通常の請求額設定後、Stripeが有効なら会員画面にオンライン支払いが表示されます。",
              "まず役員を含む少人数で表示と金額を確認してから全体へ案内します。",
              "手集金も併用する場合は、現金とStripeの金額が別欄で集計されることを確認します。",
            ],
            caution: "Stripe連携の有効化と会員への請求設定は別操作です。対象者や金額を確認せず一括設定しないでください。",
            visual: <FeeSettingsDesktopPreview />,
          },
          {
            title: "会員の支払いと自動反映を確認する",
            text: "会員は会員画面の会費案内から「オンラインで支払う」を押し、Stripeの安全な決済画面でカードまたは有効化済みのPayPayを選びます。支払い完了後、役員は会費一覧を更新し、Stripe入金額と未入金額が正しく反映されたことを確認します。",
            points: [
              "会員へは支払う年度、金額、期限、支払い完了画面まで確認するよう案内します。",
              "二重支払いを避けるため、完了画面が出た後に同じボタンを繰り返し押さないよう案内します。",
              "反映に時間がかかる場合は画面を更新し、Stripe状態と決済結果を確認します。",
            ],
            caution: "役員が会員のカード番号や確認コードを聞き取って代理入力しないでください。会員本人がStripe画面へ入力します。",
            visual: <MemberPaymentDesktopPreview />,
          },
          {
            title: "運用開始後の確認とトラブル対応",
            text: "日常運用では、会費一覧のStripe入金、未入金、入金先口座、決済受付、入金／振込の状態を定期的に確認します。代表者・住所・口座などを変更した場合やStripeから確認メールが届いた場合は、登録を再開して不足項目を完了します。",
            points: [
              "決済できない：Stripe状態を更新し、決済受付が有効か確認します。",
              "入金されない：入金／振込が有効か、口座末尾が正しいか、Stripeの案内がないか確認します。",
              "登録画面が開かない：ポップアップ制限を解除し、1回だけ再実行します。",
              "解決しない：エラー文、発生時刻、操作箇所を控えます。個人情報や書類画像は添付しません。",
            ],
            caution: "組織区分、代表者、本人確認、銀行口座に関するStripeの判断は、Stripe画面とStripeからの通知を優先してください。",
            visual: <StripeDesktopPreview focus="status" />,
          },
        ]}
      />
    </ManualAccessGate>
  );
}
