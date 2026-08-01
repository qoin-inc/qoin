import type { Metadata } from "next";
import {
  ActualScreenImage,
  OnboardingGuide,
} from "../_components/OnboardingGuide";

export const metadata: Metadata = {
  title: "町内会・自治会を新規申し込みする | el-town オンラインマニュアル",
  description: "町内会・自治会の代表役員が、el-townへ団体と代表者アカウントを新規登録する手順です。",
};

export default function AdminSignupManualPage() {
  return (
    <OnboardingGuide
      theme="blue"
      audience="代表役員向け"
      audienceIcon="fa-people-roof"
      title="町内会・自治会を新規申し込みする"
      summary="町内会・自治会をはじめてel-townへ登録し、最初の代表役員アカウントを作成する手順です。"
      time="約5分"
      preparation={[
        { icon: "fas fa-people-roof", title: "団体の基本情報", text: "正式名称・郵便番号・おおよその会員世帯数" },
        { icon: "fas fa-id-card", title: "代表者の情報", text: "役職・お名前・使用できるメールアドレス" },
        { icon: "fas fa-key", title: "安全なパスワード", text: "8文字以上で、3種類以上の文字を使用" },
      ]}
      steps={[
        {
          title: "トップ画面から「役員の方」を開く",
          text: "el-townのトップ画面で「役員の方」を押し、役員ログイン画面を開きます。すでに登録済みの団体へ参加する場合は、この新規申し込みではなく代表役員からの招待URLを使用してください。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/top-menu.png"
              alt="役員の方ボタンが表示された実際のel-townトップ画面"
              caption="実際のトップ画面で「役員の方」を選びます"
            />
          ),
        },
        {
          title: "新規の町内会・自治会を登録する",
          text: "役員ログイン画面の下にある「新規の町内会・自治会を登録する」を押します。団体をはじめて登録する代表役員だけがこの操作を行います。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-login.png"
              alt="新規の町内会・自治会を登録するボタンがある実際の役員ログイン画面"
              caption="実際の役員ログイン画面下部に新規登録ボタンがあります"
            />
          ),
        },
        {
          title: "団体の基本情報を入力する",
          text: "町内会・自治会名、郵便番号、会員世帯数、申し込む方の役職を入力します。団体名は略称ではなく、普段使用している正式名称を入力してください。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-signup-top.png"
              alt="町内会名、郵便番号、会員世帯数、役職の入力欄がある実際の新規登録画面"
              caption="実際の新規登録画面・前半"
            />
          ),
        },
        {
          title: "代表役員の情報とパスワードを入力する",
          text: "お名前、メールIDは今後のログインに使用するアドレスを入力します。パスワードは英大文字・英小文字・数字・記号のうち3種類以上を組み合わせ、8文字以上で設定し、確認欄にも同じ内容を入力します。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-signup-bottom.png"
              alt="代表役員のお名前、メールID、パスワード入力欄がある実際の新規登録画面"
              caption="実際の新規登録画面・後半"
            />
          ),
        },
        {
          title: "内容を確認して登録を開始する",
          text: "団体名・メールID・パスワードを確認し、「登録して開始」を押します。登録した町内会・自治会の管理画面が表示されたら、新規申し込みは完了です。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-signup-bottom.png"
              alt="登録して開始ボタンがある実際の新規登録画面"
              caption="入力内容を確認し、実画面の「登録して開始」を押します"
            />
          ),
        },
      ]}
    />
  );
}
