"use client";

import React, { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useLiff } from "@/components/LiffProvider";
import { supabase } from "@/lib/supabaseClient";

function PortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isInitialized, lineProfile } = useLiff();

  let redirectTarget = searchParams?.get("redirect") || searchParams?.get("goto") || searchParams?.get("open");
  if (!redirectTarget) {
    let liffState = searchParams?.get("liff.state");
    if (liffState) {
      try { liffState = decodeURIComponent(liffState); } catch (e) {}
      const stateParams = new URLSearchParams(liffState.startsWith("?") ? liffState : `?${liffState}`);
      redirectTarget = stateParams.get("redirect") || stateParams.get("goto") || stateParams.get("open");
    }
  }

  useEffect(() => {
    if (!isInitialized) return;

    const checkExistingUser = async () => {
      if (redirectTarget) {
        if (redirectTarget === "portal") {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session && lineProfile?.userId) {
            await supabase.auth.signInWithPassword({
              email: `${lineProfile.userId}@line.eltown.local`,
              password: `lineAuth_${lineProfile.userId}_eltown`,
            });
          }
          window.location.href = "/portal";
          return;
        }
        if (redirectTarget === "resident") router.push("/resident/");
        else if (redirectTarget === "admin") router.push("/admin/");
        else router.push(`/resident/?open=${redirectTarget}`);
        return;
      }

      if (lineProfile?.userId) {
        try {
          const { data } = await supabase
            .from("resident_rosters")
            .select("id")
            .or(`user_auth_id.eq.${lineProfile.userId},family_user_auth_id_1.eq.${lineProfile.userId},family_user_auth_id_2.eq.${lineProfile.userId}`)
            .limit(1);
          if (data && data.length > 0) {
            router.push("/resident/");
            return;
          }
        } catch (e) {
          console.error("Auto login check failed:", e);
        }
      }
    };

    checkExistingUser();
  }, [isInitialized, lineProfile, redirectTarget, router]);

  if (redirectTarget) {
    return (
      <div className="el-loading-screen">
        <div className="el-spinner" />
        <p>el-townを開いています...</p>
      </div>
    );
  }

  return (
    <main className="initial-menu-screen initial-menu-screenshot-style">
      <div className="initial-menu-sky" aria-hidden="true" />
      <section className="initial-menu-card" aria-label="el-town 初期メニュー">
        <div className="initial-menu-brand">
          <img className="initial-menu-logo" src="/assets/logo_horizontal_final.png" alt="el-town" />
          <p>町内会・自治会DXアプリ</p>
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
              <small>会員の新規登録・連携はこちら</small>
            </span>
          </Link>

          <Link href="/manual/" className="initial-menu-item initial-menu-item-help">
            <span className="initial-menu-icon initial-menu-icon-gray"><i className="fas fa-book-open" /></span>
            <span>
              <strong>操作方法</strong>
              <small>使い方・ヘルプ</small>
            </span>
          </Link>
        </div>
      </section>
    </main>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={<div className="el-loading-screen"><div className="el-spinner" /></div>}>
      <PortalContent />
    </Suspense>
  );
}





