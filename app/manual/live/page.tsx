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
        returnHref="/admin?help=open"
        returnLabel="管理機能ヘルプに戻る"
        desktopLayout
        showStepNumbers={false}
        preparation={[]}
        processTitle="Live・施設予約の操作説明"
        processSubtitle=""
        steps={[
          {
            title: "Web会議",
            subtitle: "Web会議の開催案内を登録します",
            text: <>
              開催種別でLINEまたはYouTubeを選び、内容や開催日時、開催URLを入力して案内を登録します。登録した案内は会員画面のLiveタブに表示されます。参加申し込みが返信されますので一覧をご確認ください。登録したWeb会議を変更する場合は一覧から対象を選び、編集後に案内を更新します。
            </>,
            points: [
              "会員のLINEへ開催案内を送る場合は「LINEへ案内通知する」にチェックして案内を登録します。",
            ],
            visual: <LiveScreen file="02-web-meeting" title="Web会議" width={1028} height={776} />,
          },
          {
            title: "施設管理",
            subtitle: "施設の登録及び利用条件を登録します。",
            text: "施設名や規模、利用条件を時間、曜日、日で入力します。予約がされた場合は予約一覧から施設毎に確認し承認、否認します。",
            points: [
              "利用不可能な個別な日付は日付を選び、「追加」を押して登録します。",
              "登録した施設は、会員画面の施設予約で選択できるようになります。",
              "施設予約は承認・否認を行い、予約を確定します。",
              "承認した施設も、その後解除可能です。",
            ],
            visual: <LiveScreen file="03-facility-management" title="施設管理" width={1028} height={654} />,
          },
        ]}
      />
    </ManualAccessGate>
  );
}
