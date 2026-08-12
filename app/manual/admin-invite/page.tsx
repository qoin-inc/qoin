import type { Metadata } from "next";
import { OnboardingGuide } from "../_components/OnboardingGuide";
import {
  AdminInviteFormScreen,
  AdminInviteUnavailableScreen,
  AdminTownSelectionScreen,
  AdminTownSwitchScreen,
} from "../_components/AdminInviteScreens";

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
      summary="代表役員から届いた招待URLを使い、初めての役員登録または現在の役員アカウントへの所属追加を行います。"
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
          visual: <AdminInviteFormScreen />,
        },
        {
          title: "お名前とメールアドレスを入力する",
          text: "「役員として合流する」画面で、お名前と、招待されたメールアドレスを入力します。メールアドレスは招待先と同じものを使用してください。",
          visual: <AdminInviteFormScreen />,
        },
        {
          title: "初回登録か、現在のアカウントへの所属追加かを確認する",
          text: "初めて役員登録する方は、英大文字・英小文字・数字・記号のうち3種類以上を組み合わせた8文字以上のパスワードを新しく設定します。すでに同じメールアドレスで別の町内会・自治会へ登録済みの方は、現在のパスワードを使用してください。同じメールアドレスに町内会・自治会ごとの別パスワードは設定できません。",
          visual: <AdminInviteFormScreen />,
        },
        {
          title: "ログイン中なら、現在のアカウントへ所属を追加する",
          text: "招待先と同じメールアドレスでログイン中の場合、パスワード欄は表示されません。「現在のアカウントに役員所属を追加する」を押してください。現在のパスワードは変更されず、登録先の町内会・自治会だけが追加されます。",
          visual: <AdminInviteFormScreen mode="current-account" />,
        },
        {
          title: "複数の所属から管理する町内会・自治会を選ぶ",
          text: "登録後に所属先が2件以上ある場合は、「管理する町内会を選択」画面が表示されます。町内会・自治会名と役職を確認して、管理する所属先を選んでください。管理画面上部の「町内会切替」から、ログアウトせずに選び直せます。切り替えてもパスワードは共通です。",
          visual: (
            <div className="grid gap-6">
              <AdminTownSelectionScreen />
              <AdminTownSwitchScreen />
            </div>
          ),
        },
        {
          title: "招待URLを利用できないとき",
          text: "登録済みのURLを開いた場合は通常ログインへ進んでください。期限切れ・取消済み・無効なURLの場合は、代表役員へ新しい招待を依頼します。メールが届かない場合は、代表役員に「メール再送」を依頼するか、招待URLを別の連絡手段で共有してもらってください。",
          visual: <AdminInviteUnavailableScreen />,
        },
      ]}
    />
  );
}
