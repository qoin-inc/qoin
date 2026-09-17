import type { Metadata } from "next";
import { DesktopScreenPreview, OnboardingGuide } from "../_components/OnboardingGuide";
import { ManualAccessGate } from "../_components/ManualAccess";

export const metadata: Metadata = {
  title: "役員管理画面 Live・施設予約編 | el-town オンラインマニュアル",
  description: "Web会議案内の登録と、予約対象施設の登録・管理方法を説明します。",
};

function LiveScreen({
  file,
  title,
  width,
  height,
}: {
  file: string;
  title: string;
  width: number;
  height: number;
}) {
  return (
    <DesktopScreenPreview
      src={`/manual/screens/admin-live/${file}.png`}
      alt={`${title}のPC管理画面`}
      caption="画面はローカル管理画面の表示例です。"
      width={width}
      height={height}
    />
  );
}

export default function LiveManualPage() {
  return (
    <ManualAccessGate scope="admin">
      <OnboardingGuide
        theme="purple"
        audience="町内会・自治会の役員向け"
        audienceIcon="fa-people-roof"
        title="役員管理画面 Live・施設予約編"
        summary="Web会議案内と、会員が予約する施設の登録・管理方法を説明します。"
        returnHref="/admin"
        returnLabel="管理機能に戻る"
        desktopLayout
        showStepNumbers={false}
        preparation={[]}
        processTitle="Live・施設予約の操作説明"
        processSubtitle=""
        steps={[
          {
            title: "「Live・施設予約」を押下する",
            text: "管理トップの「Live・施設予約」を押し、操作する画面を「Web会議」または「施設管理」から選びます。",
            visual: <LiveScreen file="01-live-menu" title="Live・施設予約メニュー" width={1028} height={224} />,
          },
          {
            title: "Web会議",
            subtitle: "Web会議の開催案内を登録します",
            text: "開催種別でLINEまたはYouTubeを選び、「表題」「開催日」「開催時間」「開催URL」「内容」を入力して「案内を登録」を押します。登録した案内は会員画面のLiveタブに表示されます。",
            points: [
              "会員のLINEへ開催案内を送る場合は「LINEへ案内通知する」にチェックを入れます。",
              "開催URLが正しく開くことを確認してから案内を登録してください。",
              "登録済みの案内を変更する場合は一覧から対象を選び、編集後に「案内を更新」を押します。",
            ],
            visual: <LiveScreen file="02-web-meeting" title="Web会議" width={1028} height={776} />,
          },
          {
            title: "施設管理",
            subtitle: "予約を受け付ける施設と利用条件を登録します",
            text: "「施設名」「場所」「規模」「利用可能時間帯」を入力します。予約を受け付けない曜日や日付がある場合は、「利用不可能な曜日」「利用不可能な日」も設定して「施設を登録」を押します。",
            points: [
              "利用不可能な日付は日付を選び、「追加」を押して登録します。",
              "登録した施設は、会員画面の施設予約で選択できるようになります。",
              "登録済みの施設を変更する場合は対象施設を選び、編集後に「施設を更新」を押します。",
            ],
            visual: <LiveScreen file="03-facility-management" title="施設管理" width={1028} height={654} />,
          },
        ]}
      />
    </ManualAccessGate>
  );
}
