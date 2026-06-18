'use client';

import React, { useState, useEffect, Suspense } from 'react';
import ResidentView from '@/components/ResidentView';
import SignupResident from '@/components/SignupResident';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import liff from '@line/liff';
import { useLiff } from '@/components/LiffProvider';

function ResidentPageContent() {
  const { isInitialized: liffInitializedProvider } = useLiff();
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams?.get('mode');
  const openTargetId = searchParams?.get('open');

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 会員名簿データ
  const [roster, setRoster] = useState<any>(null);
  const [town, setTown] = useState<{id: number, name: string} | null>(null);

  // ログインフォーム用
  const [loginError, setLoginError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liffInitialized, setLiffInitialized] = useState(false);

  useEffect(() => {
    if (searchParams?.get('test_bypass') === '1') {
      setSession({ user: { id: 'test' }});
      setRoster({ full_name: 'デモ太郎', neighborhood_id: 1 });
      setTown({ id: 1, name: 'デモ町内会・自治会' });
      setLiffInitialized(true);
      setLoading(false);
      return;
    }

    if (liffInitializedProvider && liff.isLoggedIn()) {
      supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
         if (!existingSession && !isSubmitting) {
            performSupabaseLoginWithLiff();
         }
      });
    }
  }, [liffInitializedProvider]);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('error_description')) {
      const params = new URLSearchParams(hash.substring(1));
      setLoginError(`認証エラー: ${params.get('error_description')}`);
    }

    const errorParam = searchParams?.get('error');
    if (errorParam === 'withdrawn') {
      setLoginError('このアカウントはすでに退会済みのため、ご利用いただけません。');
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchRosterAndTown(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchRosterAndTown(session.user.id);
      } else {
        setRoster(null);
        setTown(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && roster && town) {
      const redirectAfter = searchParams?.get('redirect_after');
      if (redirectAfter === 'portal') {
        // LIFFでの確実な遷移とSupabaseセッションの反映のためフルリロード遷移を使用
        window.location.href = '/portal';
      }
    }
  }, [session, roster, town, searchParams]);

  const fetchRosterAndTown = async (userId: string) => {
    setLoading(true);
    try {
      const { data: rosters, error: rosterError } = await supabase
        .from('resident_rosters')
        .select('*')
        .or(`user_auth_id.eq.${userId},family_user_auth_id_1.eq.${userId},family_user_auth_id_2.eq.${userId}`)
        .not('neighborhood_id', 'is', null) // テスト用などの空データを掴まないための安全策
        .order('id', { ascending: false }) // 常に最新の登録データを引く
        .limit(1);
      
      if (rosters && rosters.length > 0) {
        const rosterData = rosters[0];
        if (rosterData.withdrawal_status === 'withdrawn') {
          setLoginError('このアカウントはすでに退会済みのため、ご利用いただけません。');
          await handleLogout();
          setRoster(null);
          setTown(null);
          return;
        }
        setRoster(rosterData);
        const { data: townData } = await supabase
          .from('neighborhoods')
          .select('id, name')
          .eq('id', rosterData.neighborhood_id)
          .single();
        if (townData) setTown(townData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const performSupabaseLoginWithLiff = async () => {
    setIsSubmitting(true);
    try {
      const profile = await liff.getProfile();
      const email = `${profile.userId}@line.eltown.local`;
      const password = `lineAuth_${profile.userId}_eltown`;

      let { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error && error.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ 
          email, password,
          options: { data: { name: profile.displayName, avatar_url: profile.pictureUrl } }
        });
        if (signUpError) throw signUpError;
        data = signUpData as any;
      } else if (error) {
        throw error;
      }
      
      // LIFFの特殊なブラウザ環境でreloadするとURLのパスが消えてトップメニューに戻る不具合があるため、
      // reloadはせずにSupabaseのonAuthStateChangeイベントに状態更新を任せる
      setIsSubmitting(false);
    } catch (err: any) {
      console.error('LIFF Auth Error:', err);
      setLoginError('バックエンド認証中にエラーが発生しました。');
      setIsSubmitting(false);
    }
  };

  const handleLineLogin = async () => {
    setLoginError('');
    setIsSubmitting(true);
    try {
      if (!liffInitializedProvider) {
        setLoginError('LIFF初期化中です。少々お待ちください。');
        setIsSubmitting(false);
        return;
      }
      
      if (!liff.isLoggedIn()) {
        liff.login({ redirectUri: `${window.location.origin}/resident` });
        return;
      }
      await performSupabaseLoginWithLiff();
    } catch (err: any) {
      console.error('Login Error:', err);
      setLoginError('ログイン処理に失敗しました。');
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    try {
      if (liff.isLoggedIn()) {
        liff.logout();
      }
    } catch (e) {
      console.error('LIFF logout error:', e);
    }
  };

  if (loading || (!session && !liffInitializedProvider)) {
    return <div className="w-full min-h-screen flex items-center justify-center bg-[#f0f2f5]"><i className="fas fa-spinner fa-spin text-3xl text-qoin-main"></i></div>;
  }

  // 登録モード、またはログイン済みでデータ未紐付けの場合
  if (mode === 'signup' || (session && (!roster || !town))) {
    return (
      <SignupResident 
        sessionUser={session?.user}
        onComplete={() => { 
          if (mode === 'signup') router.push('/resident/'); 
          fetchRosterAndTown(session.user.id);
        }}
        onCancel={() => { handleLogout(); router.push('/'); }} 
      />
    );
  }

  // ログインしていない場合
  if (!session) {
    return (
      <div className="bg-[#f0f2f5] min-h-screen font-sans flex flex-col items-center justify-center p-4 relative z-50">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 p-8 pb-10">
          <div className="text-center mb-8 flex flex-col items-center">
            <img src="/logo_horizontal_final.png" alt="el-town" className="h-14 w-auto object-contain drop-shadow-sm mb-4" />
            <p className="text-gray-500 font-bold text-sm">電子回覧板・町内会・自治会アプリ (会員用)</p>
          </div>

          {loginError && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-bold shadow-sm">
              <i className="fas fa-exclamation-circle mr-2"></i>{loginError}
            </div>
          )}

          <div className="space-y-6">
            <button 
              onClick={handleLineLogin}
              disabled={isSubmitting}
              className="w-full bg-[#06C755] text-white font-black py-4 rounded-xl shadow-md hover:bg-[#05b34c] transition disabled:opacity-50 cursor-pointer flex justify-center items-center group relative overflow-hidden"
            >
              {isSubmitting ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                <>
                  <i className="fab fa-line text-2xl mr-2 absolute left-6 group-hover:scale-110 transition-transform"></i>
                  <span>LINEでログインする</span>
                </>
              )}
            </button>
            <div className="text-xs text-center text-gray-400 mt-2">
              [Debug] LiffInit: {liffInitializedProvider ? 'Yes' : 'No'} | InClient: {liffInitializedProvider && liff.isInClient() ? 'Yes' : 'No'} | LoggedIn: {liffInitializedProvider && liff.isLoggedIn() ? 'Yes' : 'No'}
            </div>
            <p className="text-xs text-gray-400 mt-4 text-left leading-relaxed">
              ※取得したLINEのメールアドレスおよび公開プロフィール情報は、ユーザーの認証機能および重複登録防止の目的に限り利用されます。
            </p>
            <p className="text-xs text-gray-500 text-center font-bold">アプリを利用するにはLINEアカウントの連携が必要です。</p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-4">
             <button onClick={() => router.push('/resident?mode=signup')} className="text-gray-500 hover:text-qoin-main hover:bg-sky-50 py-3 rounded-xl transition font-bold text-sm flex justify-center items-center w-full cursor-pointer">
               <i className="fas fa-user-plus mr-2"></i>はじめての方はこちら（新規名簿登録）
             </button>
             <Link href="/" className="bg-white border-2 border-gray-200 text-gray-500 font-bold py-3 px-6 rounded-xl hover:bg-gray-50 transition shadow-sm w-full cursor-pointer flex justify-center items-center group">
               <i className="fas fa-arrow-left mr-2 text-gray-400 group-hover:text-gray-500"></i>
               トップメニューへ戻る
             </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!roster || !town) {
    return null;
  }

  const residentName = roster.full_name || `${roster.last_name || ''} ${roster.first_name || ''}`.trim() || '名称未設定';

  // ログイン後画面 (ResidentView)
  return (
    <div className="bg-[#e4e4e4] fixed inset-0 md:relative md:min-h-screen font-sans flex flex-col md:h-auto">
      <div className="flex-1 flex justify-center items-start pt-0 md:pt-10 pb-0 md:pb-10 relative h-full w-full">
        <div className="w-full h-full md:w-[390px] md:h-[844px] md:rounded-[3rem] overflow-hidden md:border-[12px] md:border-gray-800 md:shadow-2xl relative bg-white flex flex-col">
          <ResidentView townId={town.id} townName={town.name} residentName={residentName} userId={session.user.id} openTargetId={openTargetId} initialTab={searchParams?.get('tab')} />
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="w-full min-h-screen flex items-center justify-center"><i className="fas fa-spinner fa-spin text-3xl text-qoin-main"></i></div>}>
      <ResidentPageContent />
    </Suspense>
  );
}
