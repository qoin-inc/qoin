import type { Metadata } from "next";
import { ActualScreenImage, OnboardingGuide } from "../_components/OnboardingGuide";

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
      summary="代表役員から届いた招待URLを使い、初めての役員登録または現在の役員アカウントへの町内会・自治会追加を行います。"
      time="約3〜5分"
      preparation={[
        { icon: "fas fa-link", title: "招待URL", text: "代表役員から届いた、ご本人専用のURL" },
        { icon: "fas fa-envelope", title: "メールアドレス", text: "招待先として指定されたアドレス" },
        { icon: "fas fa-key", title: "パスワード", text: "初回は新しく設定。登録済みの方は現在のパスワードを使用" },
      ]}
      steps={[
        {
          title: "代表役員から招待URLを受け取る",
          text: "招待した代表役員から、メールやメッセージで届いた専用URLを開きます。通常の役員ログイン画面ではなく、必ず届いたURLから進んでください。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-invite-actual.png"
              alt="実際の役員招待登録画面"
              caption="招待URLから開く実際の役員登録画面"
              width={374}
              height={1036}
            />
          ),
        },
        {
          title: "お名前とメールアドレスを入力する",
          text: "「役員として合流する」画面で、お名前と、招待されたメールアドレスを入力します。メールアドレスは招待先と同じものを使用してください。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-invite-actual.png"
              alt="お名前とメールアドレスを入力した実際の役員登録画面"
              caption="お名前と招待先メールアドレスを入力します"
              width={374}
              height={1036}
            />
          ),
        },
        {
          title: "初回登録か、別の町内会・自治会の追加かを確認する",
          text: "初めて役員登録する方は、英大文字・英小文字・数字・記号のうち3種類以上を組み合わせた8文字以上のパスワードを新しく設定します。すでに同じメールアドレスで別の町内会・自治会へ登録済みの方は、現在のパスワードを使用してください。同じメールアドレスに町内会・自治会ごとの別パスワードは設定できません。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-invite-actual.png"
              alt="パスワード入力欄が表示された実際の役員登録画面"
              caption="初回登録または登録済みアカウントのパスワードを入力します"
              width={374}
              height={1036}
            />
          ),
        },
        {
          title: "登録済みの役員アカウントに、町内会・自治会を追加する",
          text: "すでに別の町内会・自治会で役員登録しており、そのアカウントへ招待先と同じメールアドレスでログインしている場合、パスワード欄は表示されません。「現在のアカウントに町内会・自治会を追加する」を押してください。現在のパスワードは変更されず、招待された町内会・自治会だけが追加されます。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-invite-current-account-actual.png"
              alt="ログイン中の役員アカウントへ町内会・自治会を追加する実際の画面"
              caption="登録済みの役員アカウントへ町内会・自治会を追加します"
            />
          ),
        },
        {
          title: "複数の町内会・自治会から管理先を選ぶ",
          text: "登録済みの町内会・自治会が2件以上ある場合は、「管理する町内会を選択」画面が表示されます。町内会・自治会名と役職を確認して、管理する町内会・自治会を選んでください。管理画面上部の「町内会切替」から、ログアウトせずに選び直せます。切り替えてもパスワードは共通です。",
          visual: (
            <div className="grid gap-6">
              <ActualScreenImage
                src="/manual/screens/admin-town-selection-actual.png"
                alt="実際の管理する町内会選択画面"
                caption="所属する町内会・自治会から管理先を選びます"
              />
              <ActualScreenImage
                src="/manual/screens/admin-town-switch-actual.png"
                alt="実際の役員管理画面上部にある町内会切替ボタン"
                caption="管理画面上部の町内会切替ボタン"
                width={375}
                height={812}
              />
            </div>
          ),
        },
        {
          title: "招待URLを利用できないとき",
          text: "登録済みのURLを開いた場合は通常ログインへ進んでください。期限切れ・取消済み・無効なURLの場合は、代表役員へ新しい招待を依頼します。メールが届かない場合は、代表役員に「メール再送」を依頼するか、招待URLを別の連絡手段で共有してもらってください。",
          visual: (
            <ActualScreenImage
              src="/manual/screens/admin-invite-expired-actual.png"
              alt="期限切れの招待URLを開いた実際の案内画面"
              caption="期限切れの場合は新しい招待を依頼します"
            />
          ),
        },
      ]}
    />
  );
}
