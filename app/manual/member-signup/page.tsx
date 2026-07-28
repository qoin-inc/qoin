import type { Metadata } from "next";
import {
  MockButton,
  MockField,
  MockNotice,
  OnboardingGuide,
  PhoneFrame,
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
            <PhoneFrame theme="green" title="el-town">
              <p className="text-center text-xs font-black text-[#203947]">ご利用になるメニューをお選びください</p>
              <div className="rounded-2xl border border-[#dce8ed] bg-white p-3 opacity-65">
                <p className="text-[10px] font-black text-[#607b89]">
                  <i className="fas fa-user-tie mr-2" aria-hidden="true" />
                  役員の方
                </p>
              </div>
              <div className="rounded-2xl border-2 border-[#58b77d] bg-white p-4 shadow-md">
                <p className="text-xs font-black text-[#168a51]">
                  <i className="fas fa-user-plus mr-2" aria-hidden="true" />
                  会員の方
                </p>
                <p className="mt-1 text-[10px] font-semibold text-[#607b89]">会員登録・LINE連携はこちら</p>
              </div>
              <div className="rounded-2xl border border-[#dce8ed] bg-white p-3 opacity-65">
                <p className="text-[10px] font-black text-[#607b89]">
                  <i className="fas fa-book-open mr-2" aria-hidden="true" />
                  操作方法
                </p>
              </div>
            </PhoneFrame>
          ),
        },
        {
          title: "LINEでログインする",
          text: "「LINEでログインする」を押し、表示される認証画面で連携を許可します。el-townの利用にはLINEアカウントの連携が必要です。",
          visual: (
            <PhoneFrame theme="green" title="会員用">
              <MockNotice
                icon="fab fa-line"
                title="LINEアカウントを連携"
                text="LINEの認証画面に移動します。"
              />
              <div className="rounded-xl bg-[#06c755] px-3 py-3 text-center text-xs font-black text-white">
                <i className="fab fa-line mr-2" aria-hidden="true" />
                LINEでログインする
              </div>
              <p className="px-2 text-center text-[10px] font-semibold leading-5 text-[#718792]">
                認証機能と重複登録防止の目的に限り利用されます。
              </p>
            </PhoneFrame>
          ),
        },
        {
          title: "初回登録画面で団体と住所を入力する",
          text: "LINE連携後、まだ会員名簿と連携していない方には「会員情報を連携」画面が表示されます。町内会名と、役員へ届け出ている住所を入力します。",
          visual: (
            <PhoneFrame theme="green" title="会員情報を連携">
              <MockField label="町内会名" value="エルタウン町内会" />
              <MockField label="郵便番号" value="1000001" />
              <MockField label="住所2" value="1丁目2-3" />
              <MockField label="住所3" value="建物名・部屋番号（あれば）" muted />
            </PhoneFrame>
          ),
        },
        {
          title: "世帯主と登録する方の氏名を入力する",
          text: "会員名簿に登録されている世帯主の氏名・カナと、今回LINEを連携するご本人の氏名・カナを入力します。ご本人が世帯主の場合は同じ氏名を入力します。",
          visual: (
            <PhoneFrame theme="green" title="本人情報を入力">
              <MockField label="世帯主のお名前" value="エルタウン太郎" />
              <MockField label="世帯主のカナ氏名" value="エルタウン タロウ" />
              <div className="rounded-lg bg-[#edf8f1] px-3 py-2 text-[10px] font-black text-[#168a51]">
                登録する方の本人情報
              </div>
              <MockField label="登録する方のお名前" value="エルタウン太郎" />
              <MockField label="登録する方のカナ氏名" value="エルタウン タロウ" />
            </PhoneFrame>
          ),
        },
        {
          title: "「連携する」を押して登録を完了する",
          text: "入力内容を確認して「連携する」を押します。エルタウン町内会の会員画面が表示されたら、LINEと会員名簿の連携は完了です。",
          visual: (
            <PhoneFrame theme="green" title="登録内容の確認">
              <MockField label="町内会名" value="エルタウン町内会" />
              <MockField label="登録する方" value="エルタウン太郎" />
              <MockButton theme="green">
                <i className="fas fa-link mr-2" aria-hidden="true" />
                連携する
              </MockButton>
              <MockNotice
                icon="fas fa-circle-check"
                title="連携完了"
                text="回覧板・連絡・イベントを確認できるようになります。"
              />
            </PhoneFrame>
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
