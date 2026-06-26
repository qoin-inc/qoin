'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiff } from '@/components/LiffProvider';
import Link from 'next/link';
import Card from '@/components/Card';

function PortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isInitialized } = useLiff();

  // useEffect実行前に同期的にリダイレクト判定を行う
  let redirectTarget = searchParams?.get('redirect') || searchParams?.get('goto') || searchParams?.get('open');
  if (!redirectTarget) {
    let liffState = searchParams?.get('liff.state');
    if (liffState) {
      // エンコードされている可能性を考慮してデコード
      try { liffState = decodeURIComponent(liffState); } catch(e) {}
      const stateParams = new URLSearchParams(liffState.startsWith('?') ? liffState : `?${liffState}`);
      redirectTarget = stateParams.get('redirect') || stateParams.get('goto') || stateParams.get('open');
    }
  }
  const willRedirect = !!redirectTarget;

  const [isCheckingUser, setIsCheckingUser] = React.useState(false);
  const { lineProfile } = useLiff();
  const supabase = require('@/lib/supabaseClient').supabase;

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== '/') {
      setIsCheckingUser(false);
      return;
    }
    if (!isInitialized) return;

    const checkExistingUser = async () => {
      // 1. パラメータで明示的にリダイレクト先が指定されている場合はそちらを優先
      if (redirectTarget) {
        if (redirectTarget === 'portal') {
          // LIFF環境下での確実な遷移のため、ここでセッションを確保してから/portalへ飛ばす
          const { data: { session } } = await supabase.auth.getSession();
          if (!session && lineProfile && lineProfile.userId) {
             const email = `${lineProfile.userId}@line.eltown.local`;
             const password = `lineAuth_${lineProfile.userId}_eltown`;
             await supabase.auth.signInWithPassword({ email, password });
          }
          window.location.href = '/portal';
          return;
        }

        if (redirectTarget === 'resident') router.push('/resident/');
        else if (redirectTarget === 'admin') router.push('/admin/');
        else router.push(`/resident/?open=${redirectTarget}`);
        return;
      }

      // 2. パラメータがない場合、LINEプロファイルが取得できていれば連携確認
      if (lineProfile && lineProfile.userId) {
         try {
           const userId = lineProfile.userId;
           
           // Supabaseで連携済みか確認
           const { data } = await supabase
             .from('resident_rosters')
             .select('id')
             .or(`user_auth_id.eq.${userId},family_user_auth_id_1.eq.${userId},family_user_auth_id_2.eq.${userId}`)
             .limit(1);

           if (data && data.length > 0) {
             // 連携済みの場合は居住者ポータルへ直接リダイレクト
             router.push('/resident/');
             return;
           }
         } catch (e) {
           console.error('Auto login check failed:', e);
         }
      }
      
      // 連携未確認、またはパラメータなしの場合はトップメニューを表示
      setIsCheckingUser(false);
    };

    checkExistingUser();
  }, [redirectTarget, router, isInitialized, lineProfile]);

  if (willRedirect || isCheckingUser) {
    return (
      <div className="w-full min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-qoin-main border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 font-bold text-gray-500 text-sm">el-townを開いています...</p>
      </div>
    );
  }

  return (
    <div className="bg-background min-h-screen font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="card">
        <div className="text-center mb-8 mt-2 flex flex-col items-center">
          <h1 className="text-2xl font-bold mb-4">el-town</h1>
        </div>

        <div className="flex flex-col gap-4 flex-1">
          {/* 役員の方 */}
          <Card>
            <Link href="/admin/" className="card-link">
              <div className="card-icon">
                <i className="fas fa-user-tie" />
              </div>
              <div className="card-text">
                <h2 className="card-title">役員の方</h2>
                <p className="card-subtitle">el-townを開始する場合や管理機能を使う</p>
              </div>
            </Link>
          </Card>

          {/* 会員の方 */}
          <Card>
            <Link href="/resident/" className="card-link">
              <div className="card-icon">
                <i className="fas fa-user-plus" />
              </div>
              <div className="card-text">
                <h2 className="card-title">会員の方</h2>
                <p className="card-subtitle">利用のための照合・連携</p>
              </div>
            </Link>
          </Card>

          {/* 操作マニュアル */}
        </div>
        
      </div>
      
      {/* 背景の装飾 */}
      <div className="absolute top-0 right-0 w-full h-80 bg-gradient-to-b from-qoin-main/80 to-qoin-main rounded-b-[6rem] z-0 shadow-lg transform -skew-y-6 origin-top-left -translate-y-12 pointer-events-none"></div>
      <div className="absolute bottom-10 left-10 w-32 h-32 bg-qoin-main/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
      <div className="absolute top-1/2 right-0 w-48 h-48 bg-sky-200/20 rounded-full blur-3xl z-0 pointer-events-none"></div>
    </div>
  );
}

export default function PortalPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><i className="fas fa-spinner fa-spin text-3xl text-qoin-main"></i></div>}>
      <PortalContent />
    </Suspense>
  );
}
