import type { Metadata } from "next";
import { OnboardingGuide } from "../_components/OnboardingGuide";
import { ManualAccessGate } from "../_components/ManualAccess";

export const metadata: Metadata = {
  title: "役員管理画面 Live・施設予約編 | el-town オンラインマニュアル",
  description: "Web会議案内の登録と、予約対象施設の登録・管理方法を説明します。",
};

function MenuPreview() {
  return (
    <div className="rounded-3xl border-2 border-rose-300 bg-rose-50 p-7 text-left shadow-sm">
      <div className="flex items-start gap-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-rose-600 text-2xl text-white">
          <i className="fas fa-video" aria-hidden="true" />
        </span>
        <div>
          <h4 className="text-2xl font-black text-slate-950">Live・施設予約</h4>
          <p className="mt-3 font-bold leading-7 text-slate-600">Web会議案内や施設予約を管理します。</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700">Web会議</span>
            <span className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700">施設管理</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function WebMeetingPreview() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left shadow-sm">
      <div className="mb-5 grid grid-cols-2 gap-3">
        <span className="rounded-xl bg-rose-600 px-4 py-3 text-center font-black text-white">Web会議</span>
        <span className="rounded-xl bg-white px-4 py-3 text-center font-black text-slate-500">施設管理</span>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h4 className="font-black text-slate-900">Web会議開催案内</h4>
        <div className="mt-4 grid gap-3 text-sm font-bold text-slate-600 sm:grid-cols-2">
          {["開催種別：LINE / YouTube", "表題", "開催日", "開催時間", "開催URL", "内容"].map((label) => (
            <span key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">{label}</span>
          ))}
        </div>
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">□ LINEへ案内通知する</div>
        <div className="mt-4 text-right"><span className="inline-block rounded-xl bg-rose-600 px-5 py-3 font-black text-white">案内を登録</span></div>
      </div>
    </div>
  );
}

function FacilityPreview() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left shadow-sm">
      <div className="mb-5 grid grid-cols-2 gap-3">
        <span className="rounded-xl bg-white px-4 py-3 text-center font-black text-slate-500">Web会議</span>
        <span className="rounded-xl bg-rose-600 px-4 py-3 text-center font-black text-white">施設管理</span>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <h4 className="font-black text-slate-900">施設登録</h4>
        <div className="mt-4 grid gap-3 text-sm font-bold text-slate-600 sm:grid-cols-2">
          {["施設名", "場所", "規模", "利用可能時間帯", "利用不可能な曜日", "利用不可能な日"].map((label) => (
            <span key={label} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">{label}</span>
          ))}
        </div>
        <div className="mt-4 text-right"><span className="inline-block rounded-xl bg-rose-600 px-5 py-3 font-black text-white">施設を登録</span></div>
      </div>
    </div>
  );
}

function UpdatePreview() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 text-left shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-5">
          <i className="fas fa-video text-2xl text-rose-600" aria-hidden="true" />
          <h4 className="mt-3 font-black text-slate-900">Web会議の変更</h4>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">一覧から対象を選び、編集後に「案内を更新」を押します。</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-5">
          <i className="fas fa-building text-2xl text-rose-600" aria-hidden="true" />
          <h4 className="mt-3 font-black text-slate-900">施設の変更</h4>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-600">施設情報を編集し、「施設を更新」を押します。</p>
        </div>
      </div>
    </div>
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
            visual: <MenuPreview />,
          },
          {
            title: "Web会議",
            subtitle: "Web会議の開催案内を登録します",
            text: "開催種別でLINEまたはYouTubeを選び、「表題」「開催日」「開催時間」「開催URL」「内容」を入力して「案内を登録」を押します。登録した案内は会員画面のLiveタブに表示されます。",
            points: [
              "会員のLINEへ開催案内を送る場合は「LINEへ案内通知する」にチェックを入れます。",
              "開催URLが正しく開くことを確認してから案内を登録してください。",
            ],
            visual: <WebMeetingPreview />,
          },
          {
            title: "施設管理",
            subtitle: "予約を受け付ける施設と利用条件を登録します",
            text: "「施設名」「場所」「規模」「利用可能時間帯」を入力します。予約を受け付けない曜日や日付がある場合は、「利用不可能な曜日」「利用不可能な日」も設定して「施設を登録」を押します。",
            points: [
              "利用不可能な日付は日付を選び、「追加」を押して登録します。",
              "登録した施設は、会員画面の施設予約で選択できるようになります。",
            ],
            visual: <FacilityPreview />,
          },
          {
            title: "登録内容の変更",
            subtitle: "Web会議案内や施設情報を修正します",
            text: "登録済みのWeb会議案内または施設を一覧から選んで編集します。内容を確認し、Web会議は「案内を更新」、施設は「施設を更新」を押してください。",
            points: ["削除する場合は、会員の申込や予約状況を確認してから実行してください。"],
            visual: <UpdatePreview />,
          },
        ]}
      />
    </ManualAccessGate>
  );
}
