import type { Metadata } from "next";
import {
  AnimatedAction,
  AnimatedFormPreview,
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
      summary="エルタウン町内会を初めてel-townへ登録し、最初の代表役員アカウントを作成する手順です。"
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
            <AnimatedAction
              theme="blue"
              icon="fas fa-user-tie"
              title="役員用画面へ進みます"
              text="トップ画面に表示される「役員の方」を選びます。"
              action="役員の方"
            />
          ),
        },
        {
          title: "新規の町内会・自治会を登録する",
          text: "役員ログイン画面の下にある「新規の町内会・自治会を登録する」を押します。団体を初めて登録する代表役員だけがこの操作を行います。",
          visual: (
            <AnimatedAction
              theme="blue"
              icon="fas fa-house-circle-check"
              title="新規申し込みを選びます"
              text="ログイン欄ではなく、画面下部の新規登録ボタンを押してください。"
              action="新規の町内会・自治会を登録する"
            />
          ),
        },
        {
          title: "団体の基本情報を入力する",
          text: "町内会・自治会名、郵便番号、会員世帯数、申し込む方の役職を入力します。団体名は略称ではなく、普段使用している正式名称を入力してください。",
          visual: (
            <AnimatedFormPreview
              theme="blue"
              title="町内会・自治会を新しく登録"
              fields={[
                { label: "町内会・自治会名", value: "エルタウン町内会" },
                { label: "郵便番号", value: "100-0001" },
                { label: "会員世帯数", value: "500世帯未満", type: "select" },
                { label: "役職", value: "会長" },
              ]}
            />
          ),
        },
        {
          title: "代表役員の情報とパスワードを入力する",
          text: "お名前は「エルタウン太郎」、メールIDは今後のログインに使用するアドレスを入力します。パスワードは英大文字・英小文字・数字・記号のうち3種類以上を組み合わせ、8文字以上で設定し、確認欄にも同じ内容を入力します。",
          visual: (
            <AnimatedFormPreview
              theme="blue"
              title="代表役員のログイン情報"
              fields={[
                { label: "お名前", value: "エルタウン太郎" },
                { label: "メールID", value: "admin@example.com" },
                { label: "ログインパスワード", value: "", type: "password" },
                { label: "ログインパスワード（確認用）", value: "", type: "password" },
              ]}
            />
          ),
        },
        {
          title: "内容を確認して登録を開始する",
          text: "団体名・メールID・パスワードを確認し、「登録して開始」を押します。エルタウン町内会の管理画面が表示されたら、新規申し込みは完了です。",
          visual: (
            <AnimatedFormPreview
              theme="blue"
              title="入力内容を確認"
              fields={[
                { label: "町内会・自治会名", value: "エルタウン町内会" },
                { label: "代表役員", value: "会長　エルタウン太郎" },
                { label: "メールID", value: "admin@example.com" },
              ]}
              action="登録して開始"
            />
          ),
        },
      ]}
      fields={[
        { label: "町内会・自治会名", value: "エルタウン町内会" },
        { label: "郵便番号", value: "100-0001" },
        { label: "会員世帯数", value: "現在のおおよその規模を選択" },
        { label: "役職", value: "会長" },
        { label: "お名前", value: "エルタウン太郎" },
        { label: "メールID", value: "今後のログインに使用するメールアドレス" },
        { label: "ログインパスワード", value: "8文字以上（3種類以上の文字を使用）" },
        { label: "ログインパスワード（確認用）", value: "上と同じパスワード" },
      ]}
      fieldNote="最初に申し込んだ方が代表役員になります。ほかの役員は、団体登録後に管理画面から招待してください。"
      troubleItems={[
        "すでにel-townへ登録済みの団体へ参加する場合は、新規申し込みを行わず、代表役員から届いた招待URLを使用してください。",
        "パスワードは英大文字・英小文字・数字・記号のうち3種類以上を組み合わせ、8文字以上にしてください。",
        "確認用パスワードには、上の欄と同じパスワードを入力してください。",
        "同じメールアドレスで登録済みの場合は、新規申し込みではなく役員ログイン画面からログインしてください。",
      ]}
    />
  );
}
