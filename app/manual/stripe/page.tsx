import type { Metadata } from "next";
import {
  AnimatedAction,
  AnimatedFormPreview,
  OnboardingGuide,
  StripeDesktopPreview,
} from "../_components/OnboardingGuide";
import { ManualAccessGate } from "../_components/ManualAccess";

export const metadata: Metadata = {
  title: "Stripe連携 操作マニュアル | el-town オンラインマニュアル",
  description: "町内会・自治会がStripe本番登録を行い、会費のオンライン決済と入金を開始するまでの詳しい手順です。",
};

export default function StripeManualPage() {
  return (
    <ManualAccessGate>
      <OnboardingGuide
        theme="purple"
        audience="代表役員・会計担当者向け"
        audienceIcon="fa-credit-card"
        title="Stripe連携 操作マニュアル"
        summary="エルタウン町内会を例に、準備から本人確認、入金先口座、審査状況、会費請求、会員の支払い、運用後の確認までを順番に説明します。Stripe登録は途中保存されるため、確認事項が足りない場合は無理に進めず、準備後に再開できます。"
        time="登録約20〜30分＋Stripeによる確認時間"
        processTitle="本番登録から会費の入金確認まで"
        processSubtitle="重要な個人情報はStripeの画面だけに入力し、各段階の状態を確認しながら進めます"
        returnHref="/admin"
        returnLabel="管理画面へ戻る"
        preparation={[
          { icon: "fas fa-file-lines", title: "団体の確認資料", text: "規約・会則、正式名称、団体区分、Webサイトや活動内容" },
          { icon: "fas fa-id-card", title: "代表者の本人確認書類", text: "Stripe画面に表示される有効な書類を原本で準備" },
          { icon: "fas fa-building-columns", title: "団体が管理する口座", text: "金融機関名、支店、口座番号、名義を確認できるもの" },
        ]}
        steps={[
          {
            title: "Stripe連携でできることを確認する",
            text: "Stripe Connectは、町内会・自治会が会員からオンラインで会費を受け取り、団体の口座へ入金するための決済基盤です。契約主体は団体とStripeで、el-townは管理画面と決済をつなぐ仕組みを提供します。",
            points: [
              "会員はStripeの安全な決済画面で支払い、カード情報はel-townへ保存されません。",
              "役員はel-townの会費一覧で、手集金とStripe入金を分けて確認できます。",
              "利用条件や手数料は登録時にStripe画面の最新表示を確認します。",
            ],
            caution: "Stripeのパスワード、確認コード、カード番号、本人確認書類の画像を、el-townの問い合わせやAIヘルプへ送らないでください。",
            visual: <AnimatedAction theme="purple" icon="fab fa-stripe-s" title="安全なオンライン会費" text="会員の支払いから団体口座への入金までを連携します。" action="仕組みを確認する" />,
          },
          {
            title: "団体区分と登録担当者を決める",
            text: "会則や登記の有無を確認し、管理画面の団体区分から実態に合うものを選びます。町内会・自治会・任意団体、法人、個人、行政機関を自己判断で読み替えず、規約や正式な組織形態に合わせてください。",
            points: [
              "代表者本人が確認できる状態で手続きを行います。",
              "Stripeからの確認メールを受信できる継続利用可能なメールアドレスを使います。",
              "入金先は個人の生活口座ではなく、団体で管理する口座を用意します。",
            ],
            caution: "団体区分や代表者情報が実態と異なると、追加確認や入金保留の原因になります。不明な場合は会則・登記資料を確認してください。",
            visual: <AnimatedFormPreview theme="purple" title="登録前の確認" fields={[{ label: "団体区分", value: "非営利団体（町内会・自治会・任意団体）", type: "select" }, { label: "団体名", value: "エルタウン町内会" }, { label: "登録担当", value: "代表者本人" }]} action="登録内容を確認" />,
          },
          {
            title: "el-townで団体情報を入力する",
            text: "管理トップの「基本機能」から「Stripe連携」を開きます。団体名は基本情報から同期されます。Stripe連絡先メール、問い合わせ電話番号、Webサイト、サービス内容を確認・入力してください。",
            points: [
              "サービス内容には、町内会費・自治会費をオンラインで受け取る目的を具体的に記載します。",
              "Webサイトは団体や活動内容が確認できる公開ページを入力します。",
              "登録済み内容がある場合は読み込み完了を待ち、空欄で上書きしないことを確認します。",
            ],
            caution: "団体名を変更する必要がある場合は、先に「基本情報」で正式名称を修正してからStripe連携へ戻ってください。",
            visual: <StripeDesktopPreview focus="registration" caption="現在のPC画面：右側の「本番Stripe登録を開始」で団体情報を入力します" />,
          },
          {
            title: "3つの準備確認後に本番登録を開始する",
            text: "「規約・登記上の団体区分」「代表者の本人確認書類」「団体が管理する入金先口座」の3項目を実際に準備できた場合だけチェックします。「入力内容を確認して本番Stripe登録を開始」を押すと、別画面でStripeの登録が始まります。",
            points: [
              "新しい画面が開かない場合は、ブラウザのポップアップ制限を確認してもう一度押します。",
              "途中で閉じても「本番登録を再開・確認」から続きへ戻れます。",
              "Stripe画面のURLとStripeの表示を確認してから個人情報を入力します。",
            ],
            caution: "チェックは資料を用意したという確認です。未準備のまま進めるとStripe画面で手続きが止まります。",
            visual: <StripeDesktopPreview focus="start" caption="現在のPC画面：3つの準備確認後に紫色の開始ボタンを押します" />,
          },
          {
            title: "Stripeで組織と代表者情報を入力する",
            text: "Stripeの案内に従い、組織形態、所在地、代表者の氏名、生年月日、住所、連絡先などを入力します。氏名や住所は本人確認書類の表記と一致させ、略字・旧住所・入力漏れがないか確認してください。",
            points: [
              "画面に表示される必須項目はすべて入力します。",
              "代表者が変更されている場合は、現在の代表者と団体内の承認状況を確認します。",
              "入力内容の確認画面で誤字、番地、電話番号を見直します。",
            ],
            caution: "Stripeが求める項目は団体区分や確認状況により異なります。このマニュアルにない項目が出た場合は、画面の最新案内を優先してください。",
            visual: <AnimatedFormPreview theme="purple" title="Stripe 本人情報" fields={[{ label: "代表者氏名", value: "本人確認書類と同じ表記" }, { label: "生年月日", value: "年／月／日" }, { label: "住所", value: "本人確認書類と同じ住所" }, { label: "電話番号", value: "連絡可能な番号" }]} action="内容を保存して続ける" />,
          },
          {
            title: "本人確認書類と入金先口座を登録する",
            text: "Stripe画面で指定された本人確認書類を撮影またはアップロードし、団体が管理する銀行口座を登録します。書類全体が明るく鮮明で、四隅と文字が読み取れることを確認してください。",
            points: [
              "口座名義、金融機関、支店、口座種別、番号を通帳などと照合します。",
              "アップロード後に追加撮影や別書類を求められた場合は画面の案内に従います。",
              "登録完了画面が表示されるまでブラウザの戻る操作を避けます。",
            ],
            caution: "本人確認書類と口座情報は必ずStripe画面へ直接入力します。スクリーンショットをメールやチャットへ添付しないでください。",
            visual: <AnimatedAction theme="purple" icon="fas fa-id-card" title="本人確認・口座登録" text="書類を鮮明に提出し、団体口座の名義を照合します。" action="安全なStripe画面で登録" />,
          },
          {
            title: "el-townへ戻り「Stripe状態を更新」する",
            text: "Stripeで入力を終えてel-townへ戻ったら、「Stripe状態を更新」を押します。Connectアカウント、Stripe登録名、入金先口座末尾、決済受付、入金／振込の表示を確認します。",
            points: [
              "「本番決済受付中」かつ「決済受付：有効」「入金/振込：有効」なら会費請求へ進めます。",
              "「追加入力が必要」と表示された場合は「本番登録を再開・確認」からStripeへ戻ります。",
              "審査中の場合は時間を置き、Stripeからのメールを確認してから再更新します。",
            ],
            caution: "登録画面を完了しただけでは、決済受付と入金が有効になっていない場合があります。2項目の「有効」を必ず確認してください。",
            visual: <StripeDesktopPreview focus="status" caption="現在のPC画面：左側の状態一覧と右側の「Stripe状態を更新」を照合します" />,
          },
          {
            title: "会費管理でオンライン決済を有効にする",
            text: "Stripe連携が有効になったら「基本機能」→「会費管理」を開き、受取方法でStripeカード決済を有効にして保存します。会費名称、標準額、年度開始月、会員向け支払い案内も同時に確認します。",
            points: [
              "会計年度、金額、対象者を確認してStripe請求対象に設定します。",
              "まず役員を含む少人数で表示と金額を確認してから全体へ案内します。",
              "手集金も併用する場合は、現金とStripeの金額が別欄で集計されることを確認します。",
            ],
            caution: "Stripe連携の有効化と会員への請求設定は別操作です。対象者や金額を確認せず一括設定しないでください。",
            visual: <AnimatedAction theme="purple" icon="fas fa-file-invoice-dollar" title="会費管理" text="受取方法と金額を確認し、対象会員へ請求を設定します。" action="Stripe請求対象に設定" />,
          },
          {
            title: "会員の支払いと自動反映を確認する",
            text: "会員は会員画面の会費案内から「オンラインで支払う」を押し、Stripeの決済画面で支払います。支払い完了後、役員は会費一覧を更新し、Stripe入金額と未入金額が正しく反映されたことを確認します。",
            points: [
              "会員へは支払う年度、金額、期限、支払い完了画面まで確認するよう案内します。",
              "二重支払いを避けるため、完了画面が出た後に同じボタンを繰り返し押さないよう案内します。",
              "反映に時間がかかる場合は画面を更新し、Stripe状態と決済結果を確認します。",
            ],
            caution: "役員が会員のカード番号や確認コードを聞き取って代理入力しないでください。会員本人がStripe画面へ入力します。",
            visual: <AnimatedAction theme="purple" icon="fas fa-mobile-screen-button" title="会員のオンライン支払い" text="会員本人が安全な決済画面で支払いを完了します。" action="オンラインで支払う" />,
          },
          {
            title: "運用開始後の確認とトラブル対応",
            text: "日常運用では、会費一覧のStripe入金、未入金、入金先口座、決済受付、入金／振込の状態を定期的に確認します。代表者・住所・口座などを変更した場合やStripeから確認メールが届いた場合は、登録を再開して不足項目を完了します。",
            points: [
              "決済できない：Stripe状態を更新し、決済受付が有効か確認します。",
              "入金されない：入金／振込が有効か、口座末尾が正しいか、Stripeの案内がないか確認します。",
              "登録画面が開かない：ポップアップ制限を解除し、1回だけ再実行します。",
              "解決しない：エラー文、発生時刻、操作箇所を控えます。個人情報や書類画像は添付しません。",
            ],
            caution: "団体区分、代表者、本人確認、銀行口座に関するStripeの判断は、Stripe画面とStripeからの通知を優先してください。",
            visual: <StripeDesktopPreview focus="paypay" caption="現在のPC画面：本番連携状態を確認し、必要な団体だけPayPay申請へ進みます" />,
          },
        ]}
      />
    </ManualAccessGate>
  );
}
