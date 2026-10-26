import type { Metadata } from "next";
import {
  ActualScreenImage,
  OnboardingGuide,
} from "../_components/OnboardingGuide";

export const metadata: Metadata = {
  title: "町内会・自治会を新規申し込みする | el-town オンラインマニュアル",
  description: "町内会・自治会の代表役員が、el-townへ町内会・自治会と代表者アカウントを新規登録する手順です。",
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
        { icon: "fas fa-people-roof", title: "町内会・自治会の基本情報", text: "正式名称・郵便番号・おおよその会員世帯数" },
        { icon: "fas fa-id-card", title: "代表者の情報", text: "役職・お名前・使用できるメールアドレス" },
        { icon: "fas fa-key", title: "安全なパスワード", text: "8文字以上で、3種類以上の文字を使用" },
      ]}
      steps={[
        {
          title: "トップ画面から「役員の方」を開く",
          text: "el-townのトップ画面で「役員の方」を押し、役員ログイン画面を開きます。すでに登録済みの町内会・自治会へ参加する場合は、この新規申し込みではなく代表役員からの招待URLを使用してください。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/top-menu.png"
              alt="役員の方ボタンが表示された実際のel-townトップ画面"
            />
          ),
        },
        {
          title: "新規の町内会・自治会を登録する",
          text: "役員ログイン画面の下にある「新規の町内会・自治会を登録する」を押します。町内会・自治会をはじめて登録する代表役員だけがこの操作を行います。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-login.png"
              alt="新規の町内会・自治会を登録するボタンがある実際の役員ログイン画面"
            />
          ),
        },
        {
          title: "先にメールアドレスを認証する",
          text: "初めて登録する方は「初めての方」を選び、メールIDとパスワードを入力して「確認メールを送信」を押します。新規登録のパスワードは英大文字・英小文字・数字・記号のうち3種類以上、8文字以上で設定し、確認欄にも入力してください。届いた確認メールのリンクを開きます。既にメール認証済みの方は「登録済みの方」を選び、同じメールIDと以前のパスワードでログインしてください。",
          visual: <p style={{ padding: 24, textAlign: "center", fontWeight: 700 }}>メールID・パスワード → 確認メール → メール認証</p>,
        },
        {
          title: "町内会・自治会の情報を一度だけ入力する",
          text: "メール認証後に登録画面へ戻ると、町内会・自治会名、郵便番号、会員世帯数、役職、お名前の入力欄が表示されます。別の端末でメールを開いた場合も、確認リンクから登録画面へ進めます。町内会・自治会名は普段使用している正式名称を入力してください。",
          visual: <p style={{ padding: 24, textAlign: "center", fontWeight: 700 }}>認証済みメール → 町内会情報を入力</p>,
        },
        {
          title: "登録して開始する",
          text: "入力内容を確認して「登録して開始」を押します。登録した町内会・自治会の管理画面が表示されたら、新規申し込みは完了です。",
          visual: <p style={{ padding: 24, textAlign: "center", fontWeight: 700 }}>登録して開始 → 管理画面</p>,
        },
      ]}
    />
  );
}
