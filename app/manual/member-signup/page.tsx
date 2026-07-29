import type { Metadata } from "next";
import {
  ActualScreenImage,
  AnimatedAction,
  OnboardingGuide,
} from "../_components/OnboardingGuide";

export const metadata: Metadata = {
  title: "会員として利用を開始する | el-town オンラインマニュアル",
  description: "LINEでログインし、el-townの会員名簿と本人情報を連携する手順です。",
};

export default function MemberSignupManualPage() {
  return (
    <OnboardingGuide
      theme="green"
      audience="会員向け"
      audienceIcon="fa-user-plus"
      title="会員として利用を開始する"
      summary="LINEでログインし、エルタウン町内会の会員名簿とご本人の情報を連携する手順です。"
      time="約5分"
      preparation={[
        { icon: "fab fa-line", title: "LINEアカウント", text: "普段お使いのLINEアカウント" },
        { icon: "fas fa-address-card", title: "会員名簿の情報", text: "役員へ届け出ている氏名・住所" },
        { icon: "fas fa-mobile-screen", title: "スマートフォン", text: "LINE認証を行える端末" },
      ]}
      steps={[
        {
          title: "トップ画面で「会員の方」を選ぶ",
          text: "el-townのトップ画面から「会員の方」を押し、会員用画面を開きます。「会員登録・LINE連携はこちら」と表示されたカードが目印です。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/member-home.png"
              alt="実際のel-townトップ画面"
              caption="実際のトップ画面"
            />
          ),
        },
        {
          title: "LINEでログインする",
          text: "「LINEでログインする」を押し、表示される認証画面で連携を許可します。el-townの利用にはLINEアカウントの連携が必要です。",
          visual: (
            <AnimatedAction
              theme="green"
              icon="fab fa-line"
              title="LINE認証へ進みます"
              text="初回のみLINEの認証画面が表示されます。「許可する」を押してください。"
              action="LINEでログインする"
            />
          ),
        },
        {
          title: "初回登録画面で団体と住所を入力する",
          text: "LINE連携後、まだ会員名簿と連携していない方には「会員情報を連携」画面が表示されます。町内会名と、役員へ届け出ている住所を入力します。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/member-signup-top.png"
              alt="町内会名と住所を入力する実際の会員情報連携画面"
              caption="実際の会員情報連携画面・前半"
            />
          ),
        },
        {
          title: "世帯主と登録する方の氏名を入力する",
          text: "会員名簿に登録されている世帯主の氏名・カナと、今回LINEを連携するご本人の氏名・カナを入力します。ご本人が世帯主の場合は同じ氏名を入力します。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/member-signup-bottom.png"
              alt="世帯主と登録する方の氏名を入力する実際の会員情報連携画面"
              caption="実際の会員情報連携画面・後半"
            />
          ),
        },
        {
          title: "「連携する」を押して登録を完了する",
          text: "入力内容を確認して「連携する」を押します。エルタウン町内会の会員画面が表示されたら、LINEと会員名簿の連携は完了です。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/member-signup-bottom.png"
              alt="連携するボタンが表示された実際の会員情報連携画面"
              caption="「連携する」ボタンも実画面で確認できます"
            />
          ),
        },
      ]}
      fields={[
        { label: "町内会名", value: "エルタウン町内会" },
        { label: "郵便番号", value: "役員へ届け出ている郵便番号" },
        { label: "住所2", value: "丁目・番地（例：1丁目2-3）" },
        { label: "住所3", value: "建物名・部屋番号（ある場合）" },
        { label: "世帯主のお名前", value: "エルタウン太郎" },
        { label: "世帯主のカナ氏名", value: "エルタウン タロウ" },
        { label: "登録する方のお名前", value: "エルタウン太郎" },
        { label: "登録する方のカナ氏名", value: "エルタウン タロウ" },
      ]}
      fieldNote="入力内容は、役員が登録した会員名簿と一致する必要があります。表記が分からない場合は役員へ確認してください。"
      troubleItems={[
        "町内会名は略称ではなく、名簿に登録された正式名称を入力してください。",
        "氏名、カナ、郵便番号、丁目・番地の空白や表記を確認してください。",
        "「一致する会員名簿が見つかりません」と表示された場合は、役員へ登録内容を確認してください。",
        "すでに家族2名まで連携済みの場合は、世帯主または役員へ確認してください。",
      ]}
    />
  );
}
