import type { Metadata } from "next";
import {
  DesktopScreenPreview,
  OnboardingGuide,
  StripeDesktopPreview,
} from "../_components/OnboardingGuide";
import { ManualAccessGate } from "../_components/ManualAccess";

export const metadata: Metadata = {
  title: "役員管理画面 基本機能編 | el-town オンラインマニュアル",
  description: "役員管理画面を利用する前に用意するものを確認します。",
};

export default function AdminManualPage() {
  return (
    <ManualAccessGate>
      <OnboardingGuide
        theme="blue"
        audience="町内会・自治会の役員向け"
        audienceIcon="fa-people-roof"
        title="役員管理画面 基本機能編"
        summary="役員管理画面を利用する前に用意するものを確認します。"
        time="約1分"
        returnHref="/admin"
        returnLabel="町内会の管理画面に戻る"
        desktopLayout
        preparation={[
          { icon: "fas fa-mobile-screen-button", title: "スマホまたはパソコン", text: "役員アカウントで管理画面を開ける端末" },
          { icon: "fas fa-address-book", title: "町内会・自治会の情報", text: "町内会・自治会の決算情報や会員名簿、会費、予算や決算情報など" },
        ]}
        processTitle="各管理機能の操作説明"
        processSubtitle=""
        steps={[
          {
            title: "「基本機能」を押下する",
            text: "「基本機能」は基本情報、会員管理、会費管理、システム利用料、役員管理、Stripe連携が表示されるため、操作したい項目の「開く」を押下してください。",
            points: [
              "画面上部の町内会・自治会名をご確認してください。",
              "複数の町内会・自治会を管理している役員の場合は、作業前に該当の町内会・自治会に切り替えます。",
            ],
            visual: (
              <DesktopScreenPreview
                src="/manual/screens/admin-basic/01-basic-menu.png"
                alt="管理トップの基本機能メニュー"
                caption="PC版・管理トップ：基本機能から操作画面を選びます"
                width={1264}
                height={1026}
                hotspots={[{ left: "14%", top: "35%", label: "基本機能を開く" }]}
              />
            ),
          },
          {
            title: "基本情報を設定する",
            text: "団体の正式名称、決算月、会員世帯数、郵便番号を入力し、「保存して反映」を押します。決算月は会費年度や予算・決算の区切りに使われるため、会計運用を始める前に設定してください。",
            points: [
              "団体名は会員画面や帳票にも表示されます。略称ではなく正式名称を入力します。",
              "代表者表示と登録内容を確認し、変更後は画面を開き直して反映を確かめます。",
            ],
            caution: "決算月の変更は会費管理と総会会計の対象年度に影響します。年度途中の変更は会計担当者と確認してから行ってください。",
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/02-basic-info.png" alt="基本情報のPC管理画面" caption="PC版・基本情報：団体情報を確認して保存します" hotspots={[{ left: "69%", top: "46%", label: "保存して反映" }]} />,
          },
          {
            title: "会員名簿とLINE連携を管理する",
            text: "少人数は画面から1世帯ずつ登録し、多人数はCSV取込みを使います。登録後は一覧で氏名、住所、家族情報、LINE連携、退会状態を確認し、修正するときは対象者の「編集」を押します。",
            points: [
              "初回LINE連携では、役員が登録した氏名・カナ・住所と会員の入力内容を照合します。",
              "CSV出力は更新前のバックアップや名簿確認に利用できます。",
              "本人または家族がLINE連携した世帯がシステム利用料の対象です。",
            ],
            caution: "退会承認を行うとその世帯のLINE連携が解除されます。氏名と住所を確認してから実行してください。",
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/03-member-management.png" alt="会員管理のPC管理画面" caption="PC版・会員管理：登録方法と会員一覧を同じ画面で確認します" hotspots={[{ left: "10%", top: "55%", label: "会員を登録" }, { left: "68%", top: "69%", label: "一覧を確認", delay: 1.2 }]} />,
          },
          {
            title: "会費の請求と入金を管理する",
            text: "会費名称、標準額、年度開始月、会員向け案内、受取方法を設定します。その後、対象年度と会員を選び、請求額を設定します。現金は「手集金を修正」から入力し、Stripe決済は完了後に自動反映されます。",
            points: [
              "全世帯への一括設定と、選択した会員だけへの設定を使い分けます。",
              "一覧では請求額、手集金、Stripe入金、未入金額を別々に確認できます。",
              "退会済み会員の過去の会費記録も年度集計に残ります。",
            ],
            caution: "会費設定を変更しても、作成済みの請求や入金実績は自動変更されません。金額・年度・対象者を請求前に確認してください。",
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/04-fee-management.png" alt="会費管理のPC管理画面" caption="PC版・会費管理：会費設定、請求額、入金内訳を確認します" hotspots={[{ left: "12%", top: "52%", label: "会費設定" }, { left: "62%", top: "70%", label: "請求・入金一覧", delay: 1.2 }]} />,
          },
          {
            title: "システム利用料を確認する",
            text: "支払い方法を選び、当月のLINE接続世帯数、無料プッシュ枠、超過配信数、税込請求見込みを確認します。月別請求一覧では請求日、金額、入金状態を確認し、入金後に領収書を出力できます。",
            points: [
              "カード自動決済は初回登録後、原則として毎月1日に処理されます。",
              "Stripe銀行振込を選ぶと、団体専用の振込先が請求書に表示されます。",
              "料金対象世帯数は会員管理のLINE連携状況から確認できます。",
            ],
            caution: "支払い方法が未選択のままでは自動決済されません。運用開始前にカードまたは銀行振込を選択してください。",
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/05-system-fee.png" alt="システム利用料のPC管理画面" caption="PC版・システム利用料：今月の利用数と請求見込みを確認します" hotspots={[{ left: "20%", top: "53%", label: "支払い方法" }, { left: "66%", top: "54%", label: "請求見込み", delay: 1.2 }]} />,
          },
          {
            title: "役員を招待・管理する",
            text: "候補者名、メールアドレス、役職を入力し、「招待メールを送信」を押します。招待後は「在任中」「招待中」「退任済み」のタブで状態を確認し、必要に応じて再送、退任、復活を行います。",
            points: [
              "招待URLの有効期限は発行から7日間です。期限切れの場合は再送します。",
              "複数団体へ参加する役員は、同じメールアドレスとパスワードで団体を切り替えられます。",
              "招待した相手が登録を完了したことを「在任中」で確認します。",
            ],
            caution: "最後の管理者は退任できません。先に別の役員の登録完了を確認してから担当を変更してください。",
            visual: <DesktopScreenPreview src="/manual/screens/admin-basic/06-admin-management.png" alt="役員管理のPC管理画面" caption="PC版・役員管理：招待フォームと役員の状態を確認します" hotspots={[{ left: "15%", top: "62%", label: "招待メールを送信" }, { left: "65%", top: "55%", label: "在任・招待・退任", delay: 1.2 }]} />,
          },
          {
            title: "Stripe連携を開始・確認する",
            text: "オンライン会費を受け取る場合に使います。団体区分、連絡先、Webサイト、サービス内容を入力し、本人確認書類と団体管理口座を準備してStripeの登録画面へ進みます。戻った後は「Stripe状態を更新」を押し、決済受付と入金・振込が有効か確認します。",
            points: [
              "代表者情報、本人確認書類、銀行口座はStripeの安全な画面へ直接入力します。",
              "本番登録が完了してから、会費管理でStripeカード決済を有効にします。",
              "追加入力が表示された場合はStripe画面で不足項目を完了します。",
            ],
            caution: "本人確認書類、銀行口座、カード情報、パスワードをel-townの問い合わせやAIヘルプへ送らないでください。",
            link: { href: "/manual/stripe", label: "Stripe連携の詳しい別冊マニュアルを開く" },
            visual: <StripeDesktopPreview focus="registration" caption="PC版・Stripe連携：本番登録、状態更新、PayPay申請の新画面を確認します" />,
          },
        ]}
      />
    </ManualAccessGate>
  );
}
