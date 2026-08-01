import type { Metadata } from "next";
import {
  ActualScreenImage,
  OnboardingGuide,
} from "../_components/OnboardingGuide";

export const metadata: Metadata = {
  title: "招待を受けて役員として登録する | el-town オンラインマニュアル",
  description: "代表役員から届いた招待URLを使って、el-townの役員アカウントを登録する手順です。",
};

export default function AdminInviteManualPage() {
  return (
    <OnboardingGuide
      theme="blue"
      audience="招待された役員向け"
      audienceIcon="fa-envelope-open-text"
      title="招待を受けて役員として登録する"
      summary="代表役員から届いた招待URLを使い、町内会・自治会の役員アカウントを登録します。"
      time="約3分"
      preparation={[
        { icon: "fas fa-link", title: "招待URL", text: "代表役員から届いた、ご本人専用のURL" },
        { icon: "fas fa-envelope", title: "メールアドレス", text: "招待先として指定されたアドレス" },
        { icon: "fas fa-key", title: "パスワード", text: "ご自身で決める8文字以上の文字列" },
      ]}
      steps={[
        {
          title: "代表役員から招待URLを受け取る",
          text: "招待した代表役員から、メールやメッセージで届いた専用URLを開きます。通常の役員ログイン画面ではなく、必ず届いたURLから進んでください。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-invite-form.png"
              alt="招待URLを開いたときに表示される実際の役員登録画面"
              caption="招待URLを開くと、この役員登録画面が表示されます"
            />
          ),
        },
        {
          title: "お名前とメールアドレスを入力する",
          text: "「役員として合流する」画面で、お名前（または役職名）と、招待されたメールアドレスを入力します。メールアドレスは招待先と同じものを使用してください。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-invite-form.png"
              alt="実際の役員として合流する登録画面"
              caption="実際の「役員として合流する」画面"
            />
          ),
        },
        {
          title: "安全なパスワードを設定する",
          text: "英大文字・英小文字・数字・記号のうち3種類以上を組み合わせ、8文字以上で設定します。確認欄にも同じパスワードを入力してください。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-invite-form.png"
              alt="パスワード欄と確認用パスワード欄がある実際の役員登録画面"
              caption="パスワード欄も実画面で確認できます"
            />
          ),
        },
        {
          title: "役員として合流する",
          text: "入力内容を確認し、「パスワードを設定して役員に合流する」を押します。登録先の町内会・自治会の管理画面が表示されたら登録完了です。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-invite-form.png"
              alt="パスワードを設定して役員に合流するボタンがある実際の役員登録画面"
              caption="実画面の一番下にある登録ボタンを押します"
            />
          ),
        },
      ]}
    />
  );
}
