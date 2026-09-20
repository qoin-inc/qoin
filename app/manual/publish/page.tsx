import type { Metadata } from "next";
import { DesktopScreenPreview, OnboardingGuide } from "../_components/OnboardingGuide";
import { ManualAccessGate } from "../_components/ManualAccess";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "役員管理画面 発信機能編 | el-town オンラインマニュアル",
  description: "電子回覧板・連絡・イベント・総会案内の発信と、参加回答・委任状の確認手順を説明します。",
};

function PublishScreen({ file, title, proxy = false }: { file: string; title: string; proxy?: boolean }) {
  return <DesktopScreenPreview
    src={`/manual/screens/admin-publish/${file}.png`}
    alt={`${title}のPC管理画面の入力例`}
    width={1264}
    height={712}
    crop={proxy ? { left: 153, top: 23, width: 944, height: 590 } : { left: 135, top: 97, width: 982, height: 610 }}
  />;
}

export default function PublishManualPage() {
  return (
    <ManualAccessGate scope="admin">
      <div className={styles.guide}>
      <OnboardingGuide
        theme="blue"
        audience="町内会・自治会の役員向け"
        audienceIcon="fa-people-roof"
        title="役員管理画面 発信機能編"
        summary="電子回覧板・連絡・イベント・総会案内の操作方法を説明します。"
        returnHref="/admin?help=open"
        returnLabel="管理機能ヘルプに戻る"
        desktopLayout
        showStepNumbers={false}
        preparation={[]}
        processTitle="各発信機能の操作説明"
        processSubtitle=""
        steps={[
          {
            title: "電子回覧板",
            subtitle: "町内会・自治会の回覧板を電子化",
            text: "「表題」「送り主」「内容」を入力し、回覧資料をPDF等にて添付し、「発信」を押下し会員に送付します。会員のLINEに通知する場合は「LINEへプッシュ通知する」にチェックを入れて発信します。発信した場合、会員はLINEの画面に電子回覧板が通知されます。",
            points: [
              "「LINEへプッシュ通知する」にした場合、２００通を超えた場合は超過料金がかかりますのでご注意ください。",
            ],
            visual: <PublishScreen file="02-circular" title="電子回覧板" />,
          },
          {
            title: "連絡",
            subtitle: "町内会・自治会の連絡事項を発信",
            text: "「表題」「送り主」「内容」を入力します。連絡事項など会員に発信する場合に利用し、必要に応じて画像・PDFなどを添付して送信します。",
            visual: <PublishScreen file="03-notice" title="連絡" />,
          },
          {
            title: "イベント",
            subtitle: "イベントを案内し参加者を募集します",
            text: "イベントがある場合に内容や開催日時を案内します。案内されたイベントに会員からの申し込みが返信でき、参加者人数を確認できます。",
            points: [
              "会員はスマホからイベントを開き、参加する人数を申込します。参加申込が届くと、発信一覧の対象イベントに大人・子供の参加人数を確認できます。",
              "イベントの日程や内容を変更する場合は、発信一覧の「編集」から修正、イベント削除も可能です。",
            ],
            visual: <PublishScreen file="04-event" title="イベント" />,
          },
          {
            title: "総会案内",
            subtitle: "総会を案内し、出欠返信、委任状を受け付けます",
            text: "総会案内通知を案内文書を添付してを送信します。委任状の様式を作成できますので、文章の位置などを調整しながら、町内会・自治会にあったものを作成でき、会員が返信可能としています。",
            points: [
              "会員は総会案内に出席、欠席の他、欠席の場合委任状を添付できます。",
              "委任状が提出されると、対象の回答欄から委任状のPDF・画像を開くか、「委任状PDF印刷」で内容を確認できます。",
            ],
            visual: <PublishScreen file="05-assembly" title="総会案内" />,
          },
          {
            title: "委任状の設定と確認",
            subtitle: "委任状の文面を確認して送付する",
            text: "総会案内の「委任状定型文」に文面を入力します。文字位置を変える場合は対象の行を選択して「左揃え」「中央揃え」「右揃え」を押下し変更します。「委任状PDFを確認」で委任状全体を確認してください。",
            points: [
              "定型文を入力しない場合は、総会の表題に合わせた標準の文面が使用されます。",
            ],
            visual: <PublishScreen file="06-proxy" title="委任状定型文とLINE通知" proxy />,
          },
        ]}
      />
      </div>
    </ManualAccessGate>
  );
}
