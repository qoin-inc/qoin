import type { Metadata } from "next";
import { DesktopScreenPreview, OnboardingGuide } from "../_components/OnboardingGuide";
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
            caution: "別の町内会・自治会を選んだまま保存すると、その町内会・自治会の情報が変更されます。最初に町内会・自治会名を必ず確認してください。",
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
        ]}
      />
    </ManualAccessGate>
  );
}
