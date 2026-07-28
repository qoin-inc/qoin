import type { Metadata } from "next";
import {
  MockButton,
  MockField,
  MockNotice,
  OnboardingGuide,
  PhoneFrame,
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
            <PhoneFrame theme="blue" title="招待メッセージ">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <p className="text-[10px] font-bold text-[#7a8e98]">エルタウン町内会</p>
                <p className="mt-2 text-xs font-black text-[#203947]">役員への招待が届きました</p>
                <p className="mt-3 text-[10px] font-semibold leading-5 text-[#607b89]">
                  エルタウン町内会の役員として、el-townへの登録をお願いします。
                </p>
                <div className="mt-4 rounded-lg bg-[#e8f7fb] px-3 py-2 text-[10px] font-black text-[#118bb3]">
                  招待URLを開く
                </div>
              </div>
              <MockNotice
                icon="fas fa-shield-halved"
                title="ご本人専用のURLです"
                text="他の方へ転送せず、招待された方が開きます。"
              />
            </PhoneFrame>
          ),
        },
        {
          title: "お名前とメールアドレスを入力する",
          text: "「役員として合流する」画面で、お名前（または役職名）と、招待されたメールアドレスを入力します。メールアドレスは招待先と同じものを使用してください。",
          visual: (
            <PhoneFrame theme="blue" title="役員として合流する">
              <p className="text-center text-[10px] font-semibold text-[#607b89]">
                ご自身のお名前とパスワードを設定してください。
              </p>
              <MockField label="お名前（または役職名）" value="副会長 エルタウン太郎" />
              <MockField label="メールアドレス" value="招待を受け取ったアドレス" muted />
            </PhoneFrame>
          ),
        },
        {
          title: "安全なパスワードを設定する",
          text: "英大文字・英小文字・数字・記号のうち3種類以上を組み合わせ、8文字以上で設定します。確認欄にも同じパスワードを入力してください。",
          visual: (
            <PhoneFrame theme="blue" title="パスワードの設定">
              <MockField label="設定するパスワード" value="••••••••••" />
              <MockField label="パスワード（確認用）" value="••••••••••" />
              <div className="rounded-xl bg-[#fff8e6] p-3 text-[10px] font-semibold leading-5 text-[#7a652a]">
                <i className="fas fa-lightbulb mr-1" aria-hidden="true" />
                3種類以上の文字を組み合わせます
              </div>
            </PhoneFrame>
          ),
        },
        {
          title: "役員として合流する",
          text: "入力内容を確認し、「パスワードを設定して役員に合流する」を押します。エルタウン町内会の管理画面が表示されたら登録完了です。",
          visual: (
            <PhoneFrame theme="blue" title="登録内容の確認">
              <MockField label="お名前" value="副会長 エルタウン太郎" />
              <MockField label="所属" value="エルタウン町内会" />
              <MockButton theme="blue">パスワードを設定して役員に合流する</MockButton>
              <MockNotice
                icon="fas fa-circle-check"
                title="登録完了"
                text="管理画面が表示されたら、役員としての登録は完了です。"
              />
            </PhoneFrame>
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
