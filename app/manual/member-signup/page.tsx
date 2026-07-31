import type { Metadata } from "next";
import {
  ActualScreenImage,
  OnboardingGuide,
  QrLineScanVisual,
} from "../_components/OnboardingGuide";

export const metadata: Metadata = {
  title: "会員として利用を開始する | el-town オンラインマニュアル",
  description: "会員用QRコードをLINEで読み取り、el-townの会員名簿と本人情報を照合・連携する手順です。",
};

export default function MemberSignupManualPage() {
  return (
    <OnboardingGuide
      theme="green"
      audience="会員向け"
      audienceIcon="fa-user-plus"
      title="会員として利用を開始する"
      summary="役員から案内された会員用QRコードをLINEで読み取り、エルタウン町内会の会員名簿とご本人の情報を照合して利用を開始する手順です。"
      time="約5分"
      preparation={[
        { icon: "fab fa-line", title: "LINEアカウント", text: "普段お使いのLINEアカウント" },
        { icon: "fas fa-qrcode", title: "会員用QRコード", text: "役員から配布・案内されたQRコード" },
        { icon: "fas fa-address-card", title: "会員名簿の情報", text: "役員へ届け出ている氏名・住所" },
      ]}
      steps={[
        {
          title: "会員用QRコードをLINEで読み取る",
          text: "役員から配布・案内された会員用QRコードを用意します。LINEを開き、「ホーム」画面上部のQRコードリーダーを押してください。紙や別の端末に表示されたQRコードはカメラで読み取ります。QRコードが同じスマートフォンに画像で届いた場合は、読み取り画面の画像ボタンから保存した画像を選びます。読み取り結果に表示されたel-townのリンクを押して開いてください。",
          visual: <QrLineScanVisual />,
        },
        {
          title: "LINE認証を許可する",
          text: "QRコードからel-townを開くと、初回のみLINEの認証画面が表示されます。内容を確認して「許可する」を押します。認証後、会員名簿との照合画面へ進みます。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/member-signup-top.png"
              alt="LINE認証後に表示される実際の会員情報連携画面"
              caption="LINE認証が完了すると、実際の会員情報連携画面が表示されます"
            />
          ),
        },
        {
          title: "会員名簿に登録された団体と住所を入力する",
          text: "「会員情報を連携」画面で、町内会名・郵便番号・住所を入力します。ここで入力する内容は、役員が事前に登録した会員名簿の内容と一致する必要があります。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/member-signup-top.png"
              alt="町内会名と住所を入力する実際の会員情報連携画面"
              caption="実際の会員情報連携画面・前半"
            />
          ),
        },
        {
          title: "会員名簿に登録された氏名を入力する",
          text: "会員名簿に登録されている世帯主の氏名・カナと、今回LINEを連携するご本人の氏名・カナを入力します。LINEの表示名ではありません。ご本人が世帯主の場合は、両方に同じ氏名を入力します。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/member-signup-bottom.png"
              alt="世帯主と登録する方の氏名を入力する実際の会員情報連携画面"
              caption="実際の会員情報連携画面・後半"
            />
          ),
        },
        {
          title: "名簿との照合を完了する",
          text: "入力内容を確認して「連携する」を押します。登録済みの会員名簿と一致すると、LINEアカウントがその会員情報へ連携されます。エルタウン町内会の会員画面が表示されたら完了です。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/member-home.jpg"
              alt="エルタウン町内会の回覧とお知らせが表示された会員ホーム画面"
              caption="連携が完了すると、エルタウン町内会の回覧やお知らせが表示されます"
            />
          ),
        },
      ]}
      troubleItems={[
        "必ず役員から案内された会員用QRコードをLINEで読み取って開始してください。",
        "町内会名は略称ではなく、名簿に登録された正式名称を入力してください。",
        "氏名、カナ、郵便番号、丁目・番地の空白や表記を確認してください。",
        "「一致する会員名簿が見つかりません」と表示された場合は、役員へ登録内容を確認してください。",
        "すでに家族2名まで連携済みの場合は、世帯主または役員へ確認してください。",
      ]}
    />
  );
}
