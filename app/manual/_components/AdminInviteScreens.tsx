import Image from "next/image";

function PhoneScreen({ children, caption }: { children: React.ReactNode; caption: string }) {
  return (
    <figure className="m-0 w-full max-w-[310px] text-center">
      <div className="relative min-h-[430px] overflow-hidden rounded-[2.4rem] border-[8px] border-[#26343c] bg-[#f0f2f5] px-4 py-6 shadow-[0_20px_45px_rgba(27,55,68,.2)]">
        <div className="absolute inset-x-0 top-0 h-36 rounded-b-[3rem]" style={{ backgroundColor: "#52b3d9" }} aria-hidden="true" />
        <div className="relative rounded-[1.5rem] bg-white p-5 shadow-xl">{children}</div>
      </div>
      <figcaption className="mt-3 text-[11px] font-black text-[#607b89]">
        <i className="fas fa-camera mr-2" aria-hidden="true" />
        {caption}
      </figcaption>
    </figure>
  );
}

function ScreenHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4 text-center">
      <p className="text-[9px] font-black text-[#718792]">役員として合流する</p>
      <h4 className="mt-1 text-[15px] font-black leading-5 text-[#118bb3]">{title}</h4>
      <p className="mt-2 text-[8px] font-bold leading-4 text-[#718792]">{subtitle}</p>
    </div>
  );
}

function Field({ label, value, password = false }: { label: string; value: string; password?: boolean }) {
  return (
    <div className="text-left">
      <span className="mb-1 block text-[9px] font-black text-[#344b57]">{label}</span>
      <div className="min-h-9 rounded-lg border-2 border-[#dce7eb] bg-white px-3 py-2 text-[9px] font-bold text-[#718792]">
        {password ? "••••••••••••" : value}
      </div>
    </div>
  );
}

export function AdminInviteFormScreen({ mode = "initial" }: { mode?: "initial" | "current-account" }) {
  const currentAccount = mode === "current-account";

  return (
    <PhoneScreen caption={currentAccount ? "ログイン中に所属を追加する実際の画面" : "招待URLから開く実際の役員登録画面"}>
      <ScreenHeading
        title="エルタウン町内会"
        subtitle="ご登録いただくことにより役員の管理機能が利用できます"
      />
      {currentAccount && (
        <div className="mb-3 rounded-lg border border-[#9ed7e9] p-3 text-left text-[8px] font-bold leading-4 text-[#176f8d]" style={{ backgroundColor: "#e8f7fb" }}>
          <p><i className="fas fa-circle-info mr-1" aria-hidden="true" />ログイン中の役員アカウントへ、この町内会・自治会の所属を追加します。</p>
          <p className="mt-1">パスワードは現在のものから変わりません。</p>
        </div>
      )}
      <div className="grid gap-3">
        <Field label="お名前" value="エルタウン太郎" />
        <Field label="メールアドレス" value="taro@example.jp" />
        {!currentAccount && (
          <>
            <Field label="パスワード *" value="" password />
            <p className="-mt-2 text-left text-[7px] font-bold leading-3 text-[#718792]">
              初めての方は新しいパスワードを設定します。登録済みの方は現在のパスワードを入力します。
            </p>
            <Field label="パスワード（確認用）*" value="" password />
          </>
        )}
      </div>
      <div className="mt-4 rounded-lg px-3 py-3 text-[9px] font-black leading-4 text-white shadow-lg" style={{ backgroundColor: "#118bb3" }}>
        {currentAccount ? "現在のアカウントに役員所属を追加する" : "役員として登録する"}
      </div>
      <p className="mt-4 text-[8px] font-bold text-[#718792] underline">キャンセルして戻る</p>
    </PhoneScreen>
  );
}

export function AdminTownSelectionScreen() {
  return (
    <PhoneScreen caption="登録後に表示される実際の所属先選択画面">
      <Image src="/assets/logo_horizontal_final.png" alt="el-town" width={118} height={35} className="mx-auto h-auto w-[104px]" />
      <h4 className="mt-4 text-[15px] font-black text-[#118bb3]">管理する町内会を選択</h4>
      <p className="mt-2 text-[8px] font-bold text-[#718792]">役員として所属している町内会・自治会を選んでください</p>
      <div className="mt-5 grid gap-3 text-left">
        {[
          ["エルタウン町内会", "副会長"],
          ["青空自治会", "会計"],
        ].map(([town, role]) => (
          <div className="flex items-center justify-between rounded-xl border-2 border-[#c7e9f3] px-4 py-3" style={{ backgroundColor: "#e8f7fb" }} key={town}>
            <span>
              <strong className="block text-[10px] font-black text-[#344b57]">{town}</strong>
              <small className="mt-1 block text-[8px] font-bold text-[#718792]">役職：{role}</small>
            </span>
            <i className="fas fa-chevron-right text-[10px] text-[#118bb3]" aria-hidden="true" />
          </div>
        ))}
      </div>
      <p className="mt-6 border-t border-[#e5ecef] pt-4 text-[8px] font-bold text-[#718792] underline">ログアウトして戻る</p>
    </PhoneScreen>
  );
}

export function AdminTownSwitchScreen() {
  return (
    <PhoneScreen caption="管理画面上部に表示される実際の町内会切替ボタン">
      <div className="-m-5 mb-5 px-3 py-3 text-white" style={{ backgroundColor: "#26343c" }}>
        <p className="text-left text-[8px] font-bold text-[#d8e1e5]"><i className="fas fa-map-marker-alt mr-1 text-[#52b3d9]" aria-hidden="true" />エルタウン町内会</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-md border border-[#60737d] px-2 py-2 text-[8px] font-black" style={{ backgroundColor: "#344b57" }}><i className="fas fa-home mr-1" />トップ</div>
          <div className="rounded-md px-2 py-2 text-[8px] font-black" style={{ backgroundColor: "#60737d" }}><i className="fas fa-repeat mr-1" />町内会切替</div>
        </div>
      </div>
      <h4 className="text-left text-[14px] font-black text-[#344b57]">役員管理</h4>
      <div className="mt-3 rounded-xl border border-[#dce7eb] p-4 text-left" style={{ backgroundColor: "#f7fafb" }}>
        <p className="text-[9px] font-black text-[#344b57]">現在の町内会・自治会</p>
        <p className="mt-2 text-[12px] font-black text-[#118bb3]">エルタウン町内会</p>
        <p className="mt-1 text-[8px] font-bold text-[#718792]">上部の「町内会切替」を押すと、所属先を選び直せます。</p>
      </div>
    </PhoneScreen>
  );
}

export function AdminInviteUnavailableScreen() {
  return (
    <PhoneScreen caption="招待URLを利用できないときに表示される案内画面">
      <ScreenHeading title="役員招待をご利用できません" subtitle="招待の状態をご確認ください" />
      <div className="rounded-xl border border-[#f4c7c7] p-4 text-left" style={{ backgroundColor: "#fff1f1" }}>
        <p className="text-[10px] font-black text-[#b94242]"><i className="fas fa-circle-exclamation mr-2" aria-hidden="true" />この招待は期限切れです</p>
        <p className="mt-2 text-[8px] font-bold leading-4 text-[#8a5b5b]">代表役員へ新しい招待またはメールの再送を依頼してください。</p>
      </div>
      <div className="mt-4 rounded-lg px-3 py-3 text-[9px] font-black text-white shadow-lg" style={{ backgroundColor: "#118bb3" }}>役員ログイン画面へ</div>
    </PhoneScreen>
  );
}
