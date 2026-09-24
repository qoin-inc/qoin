import type { Metadata } from "next";
import {
  FeeSettingsDesktopPreview,
  MemberPaymentMobilePreview,
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
            text: "Stripeは、町内会・自治会の会員がオンライン決済にて会費を支払うための決済基盤です。契約主体は町内会・自治会とStripeになります。el-townはオンライン決済のプラットフォームであるStripeの利用を標準で提供します。会員は町内会・自治会がStripeと契約した場合、オンライン決済が可能となり、クレジットカードや口座振込、PayPay（オプション）にて決済可能となります。",
            points: [
              "クレジットカード情報はel-townへ保存されません。",
              "el-townの会費一覧で、手入金とStripe入金を分けて確認できます。",
            ],
            caution: "Stripeのパスワード、確認コード、カード番号、本人確認書類の画像を、el-townの問い合わせやAIヘルプへ送らないでください。",
            visual: <StripeFlowDesktopPreview />,
          },
          {
            title: "Stripe画面入力前にel-town画面に設定項目を入力する",
            text: "組織区分は便宜的に「個人」を選択してください、他の「非営利団体」等を選んだ場合登録が難しくなります。町内会・自治会名、メールアドレス、電話番号、webサイト、サービス内容を入力します。町内会・自治会でwebサイトをお持ちでない場合は、el-town.jpをご登録下さい。「規約・登記上の組織区分」「代表者の本人確認書類」「町内会・自治会が管理する入金先口座」の項目を準備した後チェックし、「入力内容を確認してStripe登録を開始」を押し、別画面でStripeの登録を開始します。",
            visual: <StripeDesktopPreview focus="start" />,
          },
          {
            title: "Stripeで組織と代表者情報を入力する",
            text: "Stripeの案内に従い、el-townに設定した項目以外の所在地や連絡先、代表者の氏名、生年月日などを入力します。氏名や生年月日は本人確認書類のものと一致する必要があります。",
            points: [
              "画面に表示される必須項目はすべて入力します。",
              "代表者を変更する場合も同じ様に情報を登録します。",
            ],
            caution: "Stripeが求める項目は確認状況により異なります。このマニュアルにない項目が表示された場合は、画面の案内を優先して入力してください。",
            visual: <StripeHostedDesktopPreview stage="organization" />,
          },
          {
            title: "本人確認書類と入金先口座を登録する",
            text: "Stripe画面で指定された本人確認書類を撮影またはアップロードし、町内会・自治会が管理する銀行口座を登録します。本人確認書類全体が明るく鮮明で、四隅と文字が読み取れることを確認してください。",
            points: [
              "アップロード後に追加撮影や別書類を求められた場合は画面の案内に従います。",
              "登録完了画面が表示されるまでブラウザの戻る操作を避けます。",
            ],
            caution: "本人確認書類と口座情報は必ずStripe画面へ直接入力します。スクリーンショットをメールやチャットへ添付しないでください。",
            visual: <StripeHostedDesktopPreview stage="verification" />,
          },
          {
            title: "Stripe状態を更新する",
            text: "Stripe側の入力後、el-townの画面にて「Stripe状態を更新」を押下します。Stripe Connectアカウント、Stripe登録名、入金先口座末尾、決済受付、入金／振込の表示を確認してください。",
            points: [
              "状態が「有効」で、「決済受付：有効」「入金/振込：有効」なら会費請求へ進めます。",
              "「追加入力が必要」と表示された場合は「本番登録を再開・確認」からStripeへ戻ります。",
              "審査中の場合は時間を置き、Stripeからのメールを確認してから再更新します。",
            ],
            caution: "登録画面を完了しただけでは、決済受付と入金が有効になっていない場合があります。「有効」かどうかを必ず確認してください。",
            visual: <StripeDesktopPreview focus="status" />,
          },
          {
            title: "会費管理で請求額を設定する",
            text: "オンライン決済にて会費請求を行う場合はStripe連携が有効になったら「会費管理」から「請求額を設定」をします。会員は支払画面で利用可能な決済方法を選べます。Stripeのオンライン決済の場合、入金確定後に自動消込されます。",
            visual: <FeeSettingsDesktopPreview />,
          },
          {
            title: "会員の支払いと自動反映を確認する",
            text: "会員は会員画面の会費案内から「オンラインで支払う」にて、Stripeの安全な決済画面でクレジットカード、口座振込、PayPay(オプション）を選び支払います。会費管理の会費一覧にはオンライン決済の入金が自動反映されます。集金の入力やオンライン決済入金後、会員画面の状態は未納から完納へ変わります。",
            visual: <MemberPaymentMobilePreview />,
          },
        ]}
      />
    </ManualAccessGate>
  );
}
