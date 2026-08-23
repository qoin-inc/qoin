import type { Metadata } from "next";
import { OnboardingGuide } from "../_components/OnboardingGuide";
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
          { icon: "fas fa-address-book", title: "団体・会員情報", text: "正式名称、決算月、名簿、会費金額など" },
        ]}
        steps={[]}
      />
    </ManualAccessGate>
  );
}
