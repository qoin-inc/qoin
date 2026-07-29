import type { Metadata } from "next";
import {
  ActualScreenImage,
  AnimatedAction,
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
      summary="代表役員から届いた招待URLを使い、エルタウン町内会の役員アカウントを登録します。"
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
            <AnimatedAction
              theme="blue"
              icon="fas fa-envelope-open-text"
              title="役員招待が届きます"
              text="代表役員から届いた、ご本人専用のURLを開きます。"
              action="招待URLを開く"
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
          text: "入力内容を確認し、「パスワードを設定して役員に合流する」を押します。エルタウン町内会の管理画面が表示されたら登録完了です。",
          visual: (
            <AnimatedAction
              theme="blue"
              icon="fas fa-user-shield"
              title="入力内容を確認します"
              text="ボタンを押すと役員アカウントが登録され、管理画面へ進みます。"
              action="パスワードを設定して役員に合流する"
            />
          ),
        },
      ]}
      fields={[
        { label: "お名前（または役職名）", value: "副会長 エルタウン太郎" },
        { label: "メールアドレス", value: "招待を受け取ったメールアドレス" },
        { label: "設定するパスワード", value: "8文字以上（3種類以上の文字を使用）" },
        { label: "パスワード（確認用）", value: "上と同じパスワード" },
      ]}
      fieldNote="招待URLは役員ごとに発行されます。他の方へ転送せず、ご本人が登録してください。"
      troubleItems={[
        "「招待情報が見つかりません」と表示された場合は、URLを省略せずに開き直してください。",
        "メールアドレスが一致しない場合は、招待した代表役員に登録先を確認してください。",
        "招待が利用済み・無効の場合は、代表役員へ再招待を依頼してください。",
      ]}
    />
  );
}
