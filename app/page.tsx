import React, { Suspense } from "react";
import Link from "next/link";
import InitialRedirectHandler from "@/components/InitialRedirectHandler";

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getRedirectTarget(searchParams?: PageProps["searchParams"]) {
  const redirect = firstParam(searchParams?.redirect) || firstParam(searchParams?.goto) || firstParam(searchParams?.open);
  if (redirect) return redirect;

  const rawLiffState = firstParam(searchParams?.["liff.state"]);
  if (!rawLiffState) return null;

  let liffState = rawLiffState;
  try {
    liffState = decodeURIComponent(liffState);
  } catch {
    // LINE may already pass the value decoded.
  }

  const stateQuery = liffState.includes("?") ? liffState.slice(liffState.indexOf("?")) : liffState;
  const stateParams = new URLSearchParams(stateQuery.startsWith("?") ? stateQuery : `?${stateQuery}`);
  return stateParams.get("redirect") || stateParams.get("goto") || stateParams.get("open");
}

function LoadingScreen() {
  return (
    <div className="el-loading-screen">
      <div className="el-spinner" />
      <p>el-townを開いています...</p>
    </div>
  );
}

function InitialMenu() {
  return (
    <main className="initial-menu-screen initial-menu-screenshot-style">
      <div className="initial-menu-sky" aria-hidden="true" />
      <section className="initial-menu-card" aria-label="el-town 初期メニュー">
        <div className="initial-menu-brand">
          <img className="initial-menu-logo" src="/assets/logo_horizontal_final.png" alt="el-town" />
          <p>町内会・自治会DXアプリ</p>
        </div>

        <div className="initial-menu-welcome">
          <strong>ようこそ、el-townへ</strong>
          <p>
            ご利用になるメニューをお選びください。
            <br />
            初めての方は「操作方法」をご覧ください。
          </p>
        </div>

        <div className="initial-menu-list">
          <Link href="/admin/" className="initial-menu-item initial-menu-item-admin">
            <span className="initial-menu-icon initial-menu-icon-indigo"><i className="fas fa-user-tie" /></span>
            <span>
              <strong>役員の方</strong>
              <small>管理画面を開く</small>
            </span>
          </Link>

          <Link href="/resident/" className="initial-menu-item initial-menu-item-new">
            <span className="initial-menu-icon initial-menu-icon-orange"><i className="fas fa-user-plus" /></span>
            <span>
              <strong>会員の方</strong>
              <small>会員登録・LINE連携はこちら</small>
            </span>
          </Link>

          <Link href="/manual/" className="initial-menu-item initial-menu-item-help">
            <span className="initial-menu-icon initial-menu-icon-gray"><i className="fas fa-book-open" /></span>
            <span>
              <span className="initial-menu-badge">初めての方へ</span>
              <strong>操作方法</strong>
              <small>使い方・ヘルプを見る</small>
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}

function InitialMenuGateStyle() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: 'html:not([data-initial-menu-ready="true"]) .initial-menu-guard{display:none}',
      }}
    />
  );
}

export default function PortalPage({ searchParams }: PageProps) {
  const redirectTarget = getRedirectTarget(searchParams);

  return (
    <>
      <Suspense fallback={null}>
        <InitialRedirectHandler initialRedirectTarget={redirectTarget} />
      </Suspense>
      {redirectTarget ? (
        <LoadingScreen />
      ) : (
        <>
          <InitialMenuGateStyle />
          <div className="initial-menu-guard">
            <InitialMenu />
          </div>
        </>
      )}
    </>
  );
}
