'use client';

import Link from 'next/link';
import React, { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

type ManualAccessState = 'loading' | 'granted' | 'denied';
type ManualAccessScope = 'registered' | 'admin';

export function useManualAccess(scope: ManualAccessScope = 'registered'): ManualAccessState {
  const [state, setState] = useState<ManualAccessState>('loading');

  useEffect(() => {
    let active = true;

    const checkAccess = async (knownSession?: Session | null) => {
      setState('loading');

      if (
        process.env.NODE_ENV !== 'production' &&
        typeof window !== 'undefined' &&
        new URLSearchParams(window.location.search).get('test_bypass') === '1'
      ) {
        setState('granted');
        return;
      }

      try {
        const session = knownSession === undefined
          ? (await supabase.auth.getSession()).data.session
          : knownSession;
        if (!active) return;
        if (!session?.user?.id) {
          setState('denied');
          return;
        }

        const userId = session.user.id;
        const [adminResult, legacyAdminResult] = await Promise.all([
          supabase
            .from('neighborhood_admins')
            .select('status')
            .eq('admin_auth_id', userId)
            .eq('status', 'active')
            .limit(1),
          supabase
            .from('neighborhoods')
            .select('id')
            .eq('admin_auth_id', userId)
            .limit(1),
        ]);

        if (!active) return;

        const isAdmin = Boolean(adminResult.data?.length || legacyAdminResult.data?.length);
        if (isAdmin || scope === 'admin') {
          setState(isAdmin ? 'granted' : 'denied');
          return;
        }

        const memberResult = await supabase
          .from('resident_rosters')
          .select('id,status,withdrawal_status,user_auth_id,family_user_auth_id_1,family_user_auth_id_2,family_withdrawal_status_1,family_withdrawal_status_2')
          .or(`user_auth_id.eq.${userId},family_user_auth_id_1.eq.${userId},family_user_auth_id_2.eq.${userId}`)
          .not('neighborhood_id', 'is', null)
          .limit(20);

        if (!active) return;

        const isMember = Boolean(memberResult.data?.some((roster: any) => {
          if (roster.status === 'withdrawn' || roster.withdrawal_status === 'withdrawn') return false;
          if (roster.family_user_auth_id_1 === userId && roster.family_withdrawal_status_1 === 'withdrawn') return false;
          if (roster.family_user_auth_id_2 === userId && roster.family_withdrawal_status_2 === 'withdrawn') return false;
          return true;
        }));

        setState(isMember ? 'granted' : 'denied');
      } catch {
        if (active) setState('denied');
      }
    };

    void checkAccess();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      window.setTimeout(() => void checkAccess(session), 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [scope]);

  return state;
}

export function ManualAccessGate({
  children,
  scope = 'registered',
}: {
  children: React.ReactNode;
  scope?: ManualAccessScope;
}) {
  const access = useManualAccess(scope);

  if (access === 'loading') {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6" aria-busy="true">
        <div className="text-center text-gray-500 font-bold">
          <i className="fas fa-spinner fa-spin text-3xl text-qoin-main mb-4" aria-hidden="true" />
          <p>登録状態を確認しています</p>
        </div>
      </main>
    );
  }

  if (access === 'denied') {
    return (
      <main className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
        <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-xl">
          <i className="fas fa-lock text-4xl text-[#118bb3] mb-5" aria-hidden="true" />
          <h1 className="text-xl font-black text-gray-800">登録済みの方のみ閲覧できます</h1>
          <p className="mt-3 text-sm font-bold leading-7 text-gray-500">
            役員登録または会員接続を完了した状態で、もう一度マニュアルを開いてください。
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link href="/admin" className="rounded-xl bg-[#118bb3] px-5 py-3 font-black text-white no-underline">
              役員の方
            </Link>
            <Link href="/resident" className="rounded-xl bg-[#168a51] px-5 py-3 font-black text-white no-underline">
              会員の方
            </Link>
          </div>
          <Link href="/manual" className="mt-6 inline-block font-bold text-[#176f8d] underline">
            公開マニュアル一覧へ戻る
          </Link>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
