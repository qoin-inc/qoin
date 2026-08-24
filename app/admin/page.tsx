'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminView from '@/components/AdminView';
import SignupTown from '@/components/SignupTown';
import HelpCenter from '@/components/HelpCenter';
import { supabase } from '@/lib/supabaseClient';

type InviteStatus = 'loading' | 'valid' | 'used' | 'expired' | 'invalid' | 'revoked' | 'unavailable';
type AdminMembership = {
  adminId: string;
  role: string;
  town: { id: number; name: string };
};

const LAST_ADMIN_TOWN_KEY = 'el-town:last-admin-neighborhood';

const fetchAdminMemberships = async (accessToken: string): Promise<AdminMembership[]> => {
  const response = await fetch('/api/admin/memberships', {
    cache: 'no-store',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || '所属する町内会・自治会を確認できません。');
  }
  return Array.isArray(body?.memberships) ? body.memberships : [];
};

export default function AdminPage() {
  const [view, setView] = useState<'loading' | 'login' | 'signup' | 'join' | 'invite' | 'select_town' | 'dashboard' | 'forgot_password' | 'update_password'>('loading');
  const [town, setTown] = useState<{id: number, name: string} | null>(null);
  const [adminMemberships, setAdminMemberships] = useState<AdminMembership[]>([]);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 招待URL用ステート
  const [inviteTokenParam, setInviteTokenParam] = useState('');
  const [inviteTownName, setInviteTownName] = useState('');
  const [inviteStatus, setInviteStatus] = useState<InviteStatus>('loading');
  const [inviteName, setInviteName] = useState('');
  const [inviteSessionEmail, setInviteSessionEmail] = useState('');
  const [inviteConfirmPassword, setInviteConfirmPassword] = useState('');
  const [joinConfirmPassword, setJoinConfirmPassword] = useState('');

  const selectAdminMembership = (membership: AdminMembership) => {
    setTown(membership.town);
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(LAST_ADMIN_TOWN_KEY, String(membership.town.id));
    }
    setView('dashboard');
  };

  const applyAdminMemberships = (memberships: AdminMembership[], preferLastTown: boolean) => {
    if (memberships.length === 0) {
      throw new Error('有効な役員登録が見つかりません。町内会・自治会の代表者へご確認ください。');
    }

    setAdminMemberships(memberships);
    const lastTownId = preferLastTown && typeof window !== 'undefined'
      ? window.sessionStorage.getItem(LAST_ADMIN_TOWN_KEY)
      : null;
    const preferredMembership = lastTownId
      ? memberships.find((membership) => String(membership.town.id) === lastTownId)
      : null;

    if (memberships.length === 1 || preferredMembership) {
      selectAdminMembership(preferredMembership || memberships[0]);
      return;
    }

    setTown(null);
    setView('select_town');
  };

  // セッションがあれば自動ログイン
  useEffect(() => {
    const init = async () => {
      if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
        const testInvite = new URLSearchParams(window.location.search).get('test_invite');
        if (testInvite) {
          setInviteTokenParam('manual-preview');
          setInviteTownName('エルタウン町内会');
          setInviteName('エルタウン太郎');
          setLoginEmail('taro@example.jp');
          setLoginPassword('Sample123!');
          setInviteConfirmPassword('Sample123!');
          setLoginError(testInvite === 'expired' ? 'この招待は期限切れです。代表役員へ再送を依頼してください。' : '');
          setInviteStatus(testInvite === 'expired' ? 'expired' : 'valid');
          setInviteSessionEmail(testInvite === 'current-account' ? 'taro@example.jp' : '');
          setView('invite');
          return;
        }
        if (window.location.search.includes('test_town_switch=1')) {
          setAdminMemberships([
            { adminId: 'demo-admin-1', role: '副会長', town: { id: 1, name: 'エルタウン町内会' } },
            { adminId: 'demo-admin-2', role: '会計', town: { id: 2, name: '青空自治会' } },
          ]);
          setTown({ id: 1, name: 'エルタウン町内会' });
          setView('dashboard');
          return;
        }
      }
      if (
        typeof window !== 'undefined' &&
        process.env.NODE_ENV !== 'production' &&
        window.location.search.includes('test_memberships=2')
      ) {
        setAdminMemberships([
          { adminId: 'demo-admin-1', role: '会長', town: { id: 1, name: '青空町内会' } },
          { adminId: 'demo-admin-2', role: '会計', town: { id: 2, name: 'さくら自治会' } },
        ]);
        setView('select_town');
        return;
      }
      if (
        typeof window !== 'undefined' &&
        process.env.NODE_ENV !== 'production' &&
        window.location.search.includes('test_bypass=1')
      ) {
        setTown({ id: 1, name: 'エルタウン町内会' });
        setView('dashboard');
        return;
      }

      // URLに ?mode=signup があれば新規町内会・自治会登録画面
      if (typeof window !== 'undefined' && window.location.search.includes('mode=signup')) {
        await supabase.auth.signOut();
        setView('signup');
        return;
      }
      // URLに ?mode=update_password があればパスワード再設定画面
      if (typeof window !== 'undefined' && window.location.search.includes('mode=update_password')) {
        setView('update_password');
        return;
      }
      // URLに ?mode=invite&token=... があれば新しい招待フロー
      if (typeof window !== 'undefined' && window.location.search.includes('mode=invite')) {
        const params = new URLSearchParams(window.location.search);
        const inviteToken = params.get('token') || '';
        setInviteTokenParam(inviteToken);
        setInviteTownName('');
        setLoginError('');
        setInviteStatus('loading');
        setView('invite');

        const { data: { session: inviteSession } } = await supabase.auth.getSession();
        const currentEmail = String(inviteSession?.user?.email || '').trim().toLowerCase();
        setInviteSessionEmail(currentEmail);
        if (currentEmail) {
          setLoginEmail(currentEmail);
        }

        if (!inviteToken) {
          setLoginError('招待IDが不正です。招待URLをご確認ください。');
          setInviteStatus('invalid');
          return;
        }

        try {
          const inviteResponse = await fetch(
            `/api/admin/invite-details?token=${encodeURIComponent(inviteToken)}`,
            { cache: 'no-store' },
          );
          const inviteDetails = await inviteResponse.json().catch(() => ({}));
          if (inviteDetails?.townName) {
            setInviteTownName(String(inviteDetails.townName));
          }

          if (inviteResponse.ok) {
            setInviteStatus('valid');
            return;
          }

          const responseCode = String(inviteDetails?.code || '');
          const knownStatuses: InviteStatus[] = ['used', 'expired', 'invalid', 'revoked', 'unavailable'];
          const nextStatus = knownStatuses.includes(responseCode as InviteStatus)
            ? responseCode as InviteStatus
            : inviteResponse.status === 503
              ? 'unavailable'
              : inviteResponse.status === 409
                ? 'used'
                : inviteResponse.status === 410
                  ? 'expired'
                  : 'invalid';
          setInviteStatus(nextStatus);
          setLoginError(inviteDetails?.error || '招待先の町内会・自治会を確認できません。');
        } catch (error) {
          console.error('Failed to load admin invitation details:', error);
          setInviteStatus('unavailable');
          setLoginError('招待情報を確認できません。通信状況をご確認のうえ、もう一度お試しください。');
        }
        return;
      }
      // URLに ?mode=join があれば招待された役員の合流画面
      if (typeof window !== 'undefined' && window.location.search.includes('mode=join')) {
        await supabase.auth.signOut();
        setView('join');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        try {
          const memberships = await fetchAdminMemberships(session.access_token);
          applyAdminMemberships(memberships, true);
        } catch (error: any) {
          await supabase.auth.signOut();
          setAdminMemberships([]);
          setTown(null);
          setLoginError(error.message || '所属する町内会・自治会を確認できません。');
          setView('login');
        }
      } else {
        setView('login');
      }
    };
    init();
  }, []);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (authError) throw authError;
      const accessToken = authData.session?.access_token || '';
      const memberships = await fetchAdminMemberships(accessToken);
      applyAdminMemberships(memberships, false);
    } catch (err: any) {
      console.error(err);
      await supabase.auth.signOut();
      setAdminMemberships([]);
      setTown(null);
      setLoginError(err.message || 'ログインに失敗しました。メールアドレスとパスワードをご確認ください。');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');

    try {
      // パスワード制限チェック
      if (loginPassword !== joinConfirmPassword) {
        throw new Error('パスワードと確認用パスワードが一致しません。');
      }
      if (loginPassword.length < 8) {
        throw new Error('パスワードは8文字以上で入力してください。');
      }

      // 安全なアカウント運用のための複雑さチェック（3種類以上）
      const pwd = loginPassword;
      const hasUpper = /[A-Z]/.test(pwd);
      const hasLower = /[a-z]/.test(pwd);
      const hasDigit = /\d/.test(pwd);
      const hasSymbol = /[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/.test(pwd);
      
      let typesCount = 0;
      if (hasUpper) typesCount++;
      if (hasLower) typesCount++;
      if (hasDigit) typesCount++;
      if (hasSymbol) typesCount++;

      if (typesCount < 3) {
        throw new Error('安全なアカウント運用のために、パスワードには「英大文字」「英小文字」「数字」「記号」のうち3種類以上を組み合わせてください。');
      }

      // 1. まず入力されたメアドが招待リストに存在するかチェック
      const { data: pendingAdmin, error: pendingError } = await supabase
        .from('neighborhood_admins')
        .select('*')
        .eq('admin_email', loginEmail)
        .eq('status', 'pending')
        .single();

      if (pendingError || !pendingAdmin) {
        throw new Error('招待リストにメールアドレスが見つかりません。代表者に招待してもらってください。');
      }

      // 2. Authでユーザーを新規作成、もし既に登録済みならログインを試みる
      let authUserId;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: loginEmail,
        password: loginPassword,
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
          // 既に登録されている場合、入力されたパスワードでログインできるか検証する
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: loginPassword,
          });
          
          if (signInError) {
             throw new Error('このメールアドレスは既にシステムに登録されています。以前作成したパスワードを入力してください。（再合流）');
          }
          authUserId = signInData.user?.id;
        } else {
          throw authError;
        }
      } else {
        authUserId = authData.user?.id;
      }

      if (!authUserId) throw new Error('ユーザー情報の取得に失敗しました。');

      // 3. pending のレコードを active に更新し、UUIDを連携する
      const { error: updateError } = await supabase
        .from('neighborhood_admins')
        .update({
          admin_auth_id: authUserId,
          status: 'active'
        })
        .eq('id', pendingAdmin.id);

      if (updateError) throw updateError;

      // 4. 町内会・自治会情報を取得してダッシュボードへ
      const { data: townData } = await supabase
        .from('neighborhoods')
        .select('id, name')
        .eq('id', pendingAdmin.neighborhood_id)
        .single();

      if (townData) {
        setLoginError('役員登録は承認待ちです。代表者が承認するまでお待ちください。');
        setView('login');
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || '登録処理に失敗しました。');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteTokenParam) {
      setLoginError('招待IDが不正です。URLをご確認ください。');
      return;
    }
    
    setIsLoggingIn(true);
    setLoginError('');

    try {
      const normalizedInviteEmail = loginEmail.trim().toLowerCase();
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      let matchingSession = currentSession;
      if (
        matchingSession?.user
        && String(matchingSession.user.email || '').trim().toLowerCase() !== normalizedInviteEmail
      ) {
        await supabase.auth.signOut();
        matchingSession = null;
      }

      // 同じメールアドレスでログイン済みの場合は、既存アカウントへ所属だけを追加する。
      // ログアウト中は、初回登録または既存アカウントの本人確認にパスワードを使用する。
      if (!matchingSession?.user) {
        if (loginPassword !== inviteConfirmPassword) {
          throw new Error('パスワードと確認用パスワードが一致しません。');
        }
        if (loginPassword.length < 8) {
          throw new Error('パスワードは8文字以上で入力してください。');
        }

        const pwd = loginPassword;
        const hasUpper = /[A-Z]/.test(pwd);
        const hasLower = /[a-z]/.test(pwd);
        const hasDigit = /\d/.test(pwd);
        const hasSymbol = /[\x21-\x2f\x3a-\x40\x5b-\x60\x7b-\x7e]/.test(pwd);
        const typesCount = [hasUpper, hasLower, hasDigit, hasSymbol].filter(Boolean).length;

        if (typesCount < 3) {
          throw new Error('安全なアカウント運用のために、パスワードには「英大文字」「英小文字」「数字」「記号」のうち3種類以上を組み合わせてください。');
        }
      }

      // 1. tokenから役員候補者の招待レコードを探す
      let pendingAdminResult = await supabase
        .from('neighborhood_admins')
        .select('id, neighborhood_id, admin_email, admin_name, admin_role, status, invited_at, neighborhoods(id, name)')
        .eq('admin_invite_token', inviteTokenParam)
        .maybeSingle();

      if (pendingAdminResult.error && String(pendingAdminResult.error.message || '').includes('admin_invite_token')) {
        pendingAdminResult = await supabase
          .from('neighborhood_admins')
          .select('id, neighborhood_id, admin_email, admin_name, admin_role, status, invited_at, neighborhoods(id, name)')
          .eq('invite_token', inviteTokenParam)
          .maybeSingle();
      }

      const pendingAdmin = pendingAdminResult.data;
      if (pendingAdminResult.error || !pendingAdmin) {
        throw new Error('役員招待情報が見つかりません。招待URLが間違っているか無効になっています。');
      }
      if (pendingAdmin.status === 'retired' || pendingAdmin.status === 'rejected') {
        throw new Error('この役員招待は利用できません。代表者に再招待を依頼してください。');
      }
      if (pendingAdmin.status === 'active') {
        throw new Error('この役員招待はすでに利用済みです。通常ログインしてください。');
      }
      const invitedAt = new Date(pendingAdmin.invited_at || '').getTime();
      const inviteExpiresAt = invitedAt + (7 * 24 * 60 * 60 * 1000);
      if (!Number.isFinite(invitedAt) || inviteExpiresAt <= Date.now()) {
        throw new Error('この役員招待は発行から7日を過ぎて失効しました。代表者に再発行を依頼してください。');
      }
      if (String(pendingAdmin.admin_email || '').toLowerCase() !== normalizedInviteEmail) {
        throw new Error('招待されたメールアドレスと入力したメールアドレスが一致しません。');
      }

      const townData = Array.isArray(pendingAdmin.neighborhoods)
        ? pendingAdmin.neighborhoods[0]
        : pendingAdmin.neighborhoods;

      if (!townData) {
        throw new Error('町内会・自治会情報が見つかりません。代表者に再招待を依頼してください。');
      }

      // 2. Authでユーザーを新規作成、もし既に登録済みならログインを試みる
      let authUserId = matchingSession?.user?.id;
      if (!authUserId) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: normalizedInviteEmail,
          password: loginPassword,
        });

        if (authError) {
          if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
              email: normalizedInviteEmail,
              password: loginPassword,
            });
            if (signInError) {
              throw new Error('このメールアドレスは既にシステムに登録されています。以前作成したパスワードを入力してください。（再合流）');
            }
            authUserId = signInData.user?.id;
          } else {
            throw authError;
          }
        } else {
          authUserId = authData.user?.id;
        }
      }

      if (!authUserId) throw new Error('ユーザー情報の取得に失敗しました。');

      // 3. 招待済みの役員候補者レコードを有効化する
      let updatePayload: Record<string, any> = {
        admin_auth_id: authUserId,
        admin_email: normalizedInviteEmail,
        admin_name: inviteName.trim() || pendingAdmin.admin_name,
        status: 'active',
      };

      let updateResult = await supabase
        .from('neighborhood_admins')
        .update(updatePayload)
        .eq('id', pendingAdmin.id);

      if (updateResult.error && String(updateResult.error.message || '').includes('admin_invite_token')) {
        delete updatePayload.admin_invite_token;
        updateResult = await supabase
          .from('neighborhood_admins')
          .update(updatePayload)
          .eq('id', pendingAdmin.id);
      }
      if (updateResult.error && String(updateResult.error.message || '').includes('invite_token')) {
        delete updatePayload.invite_token;
        updateResult = await supabase
          .from('neighborhood_admins')
          .update(updatePayload)
          .eq('id', pendingAdmin.id);
      }
      if (updateResult.error) throw updateResult.error;

      // 4. 複数所属を再取得し、必要なら町内会・自治会の選択画面へ
      const { data: { session: activeSession } } = await supabase.auth.getSession();
      if (activeSession?.access_token) {
        const memberships = await fetchAdminMemberships(activeSession.access_token);
        applyAdminMemberships(memberships, false);
      } else {
        setTown(townData as any);
        setView('dashboard');
      }
    } catch (err: any) {
      console.error(err);
      setLoginError(err.message || '登録処理に失敗しました。');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSignupComplete = (newTown: {id: number, name: string}) => {
    setTown(newTown);
    setView('dashboard');
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(loginEmail, {
        redirectTo: `${window.location.origin}/admin?mode=update_password`,
      });
      if (error) throw error;
      alert('パスワード再設定用のメールを送信しました。メール内のリンクから新しいパスワードを設定してください。');
      setView('login');
    } catch (err: any) {
      setLoginError(err.message || 'メールの送信に失敗しました。');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const { error } = await supabase.auth.updateUser({ password: loginPassword });
      if (error) throw error;
      alert('パスワードを更新しました。ログイン画面から新しいパスワードでログインしてください。');
      await supabase.auth.signOut();
      window.location.href = '/admin';
    } catch (err: any) {
      setLoginError(err.message || 'パスワードの更新に失敗しました。');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (view === 'loading') {
    return (
      <main className="min-h-screen bg-[#f0f2f5] flex items-center justify-center p-6" aria-busy="true">
        <div className="text-center text-gray-500 font-bold">
          <i className="fas fa-spinner fa-spin text-3xl text-qoin-main mb-4" aria-hidden="true" />
          <p>管理機能へ戻っています</p>
        </div>
      </main>
    );
  }

  if (view === 'signup') {
    return <SignupTown onComplete={handleSignupComplete} onCancel={() => setView('login')} />;
  }

  // --- 旧仕様の Join 画面開始 ---
  if (view === 'join') {
    return (
      <div className="bg-[#f0f2f5] min-h-screen font-sans flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 p-8 pb-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-qoin-main tracking-tight mb-2">招待からの新規役員登録</h1>
            <p className="text-gray-500 font-bold text-xs">連携するパスワードをご自身で設定してください。</p>
          </div>

          <form onSubmit={handleJoinSubmit} className="space-y-5">
            {loginError && (
              <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl mb-4 border border-red-200">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">招待されたメールアドレス</label>
              <input 
                type="email" 
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-qoin-main focus:ring-2 focus:ring-sky-100 transition font-bold text-gray-700"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">設定するパスワード <span className="text-red-500">*</span></label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                placeholder="半角英数字8文字以上"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-qoin-main focus:ring-2 focus:ring-sky-100 transition font-bold text-gray-700"
                required
              />
              <p className="text-[10px] text-gray-400 font-bold mt-1 leading-relaxed">
                安全なアカウント運用のために、「英大文字」「英小文字」「数字」「記号」のうち3種類以上を組み合わせた8文字以上の文字列を設定してください。
              </p>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">パスワード（確認用） <span className="text-red-500">*</span></label>
              <input 
                type="password" 
                value={joinConfirmPassword}
                onChange={e => setJoinConfirmPassword(e.target.value)}
                placeholder="パスワードを再入力してください"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-qoin-main focus:ring-2 focus:ring-sky-100 transition font-bold text-gray-700"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-qoin-main text-white font-black py-4 rounded-xl shadow-lg hover:bg-qoin-main_hover transition disabled:opacity-50 flex items-center justify-center cursor-pointer mt-2"
            >
              {isLoggingIn ? <i className="fas fa-spinner fa-spin"></i> : 'パスワードを設定して役員に合流する'}
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
             <button type="button" onClick={() => setView('login')} className="text-sm font-bold text-gray-500 hover:text-gray-700">キャンセルして戻る</button>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-64 bg-qoin-main rounded-b-[4rem] z-0"></div>
      </div>
    );
  }
  // --- 旧仕様の Join 画面終了 ---

  if (view === 'invite') {
    const normalizedLoginEmail = loginEmail.trim().toLowerCase();
    const isAddingInviteToCurrentAccount = Boolean(
      inviteSessionEmail && normalizedLoginEmail === inviteSessionEmail,
    );

    return (
      <div className="bg-[#f0f2f5] min-h-screen font-sans flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 p-8 pb-10">
          <div className="text-center mb-8">
            <p className="text-gray-500 font-bold text-xs mb-2">役員として合流する</p>
            <h1 className="text-xl sm:text-2xl font-black text-qoin-main tracking-tight mb-3">
              {inviteTownName || (inviteStatus === 'loading' ? '招待先を確認しています…' : '役員招待をご利用できません')}
            </h1>
            <p className="text-gray-500 font-bold text-xs">
              {inviteStatus === 'valid'
                ? 'ご登録いただくことにより役員の管理機能が利用できます'
                : inviteStatus === 'loading'
                  ? '招待情報を確認しています。しばらくお待ちください'
                  : '招待の状態をご確認ください'}
            </p>
          </div>

          {inviteStatus === 'loading' ? (
            <div className="rounded-xl border border-sky-100 bg-sky-50 p-5 text-center text-sm font-bold text-gray-600">
              <i className="fas fa-spinner fa-spin mr-2 text-qoin-main" aria-hidden="true"></i>
              招待情報を確認しています
            </div>
          ) : inviteStatus === 'valid' ? (
            <form onSubmit={handleInviteSubmit} className="space-y-5">
              {loginError && (
                <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl mb-4 border border-red-200">
                  {loginError}
                </div>
              )}
              {isAddingInviteToCurrentAccount && (
                <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs font-bold leading-6 text-sky-900">
                  <p><i className="fas fa-circle-info mr-2" aria-hidden="true"></i>すでに別の町内会・自治会で役員登録しているアカウントにログイン中です。このアカウントへ、招待された町内会・自治会を追加します。</p>
                  <p className="mt-1 text-sky-700">パスワードは現在のものから変わりません。町内会・自治会ごとに別のパスワードを設定する必要はありません。</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">お名前</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-qoin-main focus:ring-2 focus:ring-sky-100 transition font-bold text-gray-700"
                  placeholder="例：エルタウン太郎"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">メールアドレス</label>
                <input
                  type="email"
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-qoin-main focus:ring-2 focus:ring-sky-100 transition font-bold text-gray-700"
                  required
                />
                {inviteSessionEmail && !isAddingInviteToCurrentAccount && (
                  <p className="mt-2 text-[10px] font-bold leading-relaxed text-amber-700">
                    現在ログイン中のメールアドレスと異なります。登録を続けると、現在のアカウントからログアウトします。
                  </p>
                )}
              </div>
              {!isAddingInviteToCurrentAccount && (
                <>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">パスワード <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="8文字以上"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-qoin-main focus:ring-2 focus:ring-sky-100 transition font-bold text-gray-700"
                      required
                    />
                    <p className="text-[10px] text-gray-500 font-bold mt-1 leading-relaxed">
                      初めて役員登録する方は新しいパスワードを設定してください。すでに別の町内会・自治会へ同じメールアドレスで登録済みの方は、現在のパスワードを入力してください。
                    </p>
                    <p className="text-[10px] text-gray-400 font-bold mt-1 leading-relaxed">
                      「英大文字」「英小文字」「数字」「記号」のうち3種類以上を組み合わせた8文字以上の文字列を使用してください。
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">パスワード（確認用） <span className="text-red-500">*</span></label>
                    <input
                      type="password"
                      value={inviteConfirmPassword}
                      onChange={e => setInviteConfirmPassword(e.target.value)}
                      placeholder="パスワードを再入力してください"
                      className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-qoin-main focus:ring-2 focus:ring-sky-100 transition font-bold text-gray-700"
                      required
                    />
                  </div>
                </>
              )}
              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-qoin-main text-white font-black py-4 rounded-xl shadow-lg hover:bg-qoin-main_hover transition disabled:opacity-50 flex items-center justify-center cursor-pointer mt-2"
              >
                {isLoggingIn
                  ? <i className="fas fa-spinner fa-spin"></i>
                  : isAddingInviteToCurrentAccount
                    ? '現在のアカウントに町内会・自治会を追加する'
                    : '役員として登録する'}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl mb-4 border border-red-200">
                {loginError || 'この役員招待は利用できません。'}
              </div>
              <p className="text-sm font-bold leading-7 text-gray-600">
                {inviteStatus === 'used'
                  ? 'この招待での役員登録は完了しています。登録したメールアドレスとパスワードでログインしてください。'
                  : inviteStatus === 'unavailable'
                    ? '一時的に招待情報を取得できませんでした。時間をおいて、もう一度お試しください。'
                    : 'このURLからは登録できません。町内会・自治会の代表者へ、新しい招待URLの発行を依頼してください。'}
              </p>
              {inviteStatus === 'unavailable' && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="w-full border-2 border-qoin-main text-qoin-main font-black py-3 rounded-xl hover:bg-sky-50 transition"
                >
                  もう一度確認する
                </button>
              )}
            </div>
          )}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <a href="/admin" className="text-sm font-bold text-gray-500 hover:text-gray-700">
              {inviteStatus === 'valid' ? 'キャンセルして戻る' : '通常ログインへ進む'}
            </a>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-64 bg-qoin-main rounded-b-[4rem] z-0"></div>
      </div>
    );
  }

  if (view === 'forgot_password') {
    return (
      <div className="bg-[#f0f2f5] min-h-screen font-sans flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 p-8 pb-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-qoin-main tracking-tight mb-2">パスワードの再設定</h1>
            <p className="text-gray-500 font-bold text-xs">登録しているメールアドレスを入力してください。<br/>再設定用のリンクを送信します。</p>
          </div>

          <form onSubmit={handleResetPasswordSubmit} className="space-y-5">
            {loginError && (
              <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl mb-4 border border-red-200">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">メールアドレス</label>
              <input 
                type="email" 
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-qoin-main focus:ring-2 focus:ring-sky-100 transition font-bold text-gray-700"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-qoin-main text-white font-black py-4 rounded-xl shadow-lg hover:bg-qoin-main_hover transition disabled:opacity-50 flex items-center justify-center cursor-pointer mt-2"
            >
              {isLoggingIn ? <i className="fas fa-spinner fa-spin"></i> : '再設定メールを送信'}
            </button>
          </form>
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
             <button type="button" onClick={() => setView('login')} className="text-sm font-bold text-gray-500 hover:text-gray-700">キャンセルして戻る</button>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-64 bg-qoin-main rounded-b-[4rem] z-0"></div>
      </div>
    );
  }

  if (view === 'update_password') {
    return (
      <div className="bg-[#f0f2f5] min-h-screen font-sans flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 p-8 pb-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-qoin-main tracking-tight mb-2">新しいパスワードの設定</h1>
            <p className="text-gray-500 font-bold text-xs">新しいログインパスワードを入力してください。</p>
          </div>

          <form onSubmit={handleUpdatePasswordSubmit} className="space-y-5">
            {loginError && (
              <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl mb-4 border border-red-200">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">新しいパスワード（英数字8字以上）</label>
              <input 
                type="password" 
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-qoin-main focus:ring-2 focus:ring-sky-100 transition font-bold text-gray-700"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isLoggingIn}
              className="w-full bg-qoin-main text-white font-black py-4 rounded-xl shadow-lg hover:bg-qoin-main_hover transition disabled:opacity-50 flex items-center justify-center cursor-pointer mt-2"
            >
              {isLoggingIn ? <i className="fas fa-spinner fa-spin"></i> : 'パスワードを更新する'}
            </button>
          </form>
        </div>
        <div className="absolute top-0 left-0 w-full h-64 bg-qoin-main rounded-b-[4rem] z-0"></div>
      </div>
    );
  }

  if (view === 'select_town' && adminMemberships.length > 0) {
    return (
      <div className="bg-[#f0f2f5] min-h-screen font-sans flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 p-8 pb-10">
          <div className="text-center mb-8">
            <img src="/assets/logo_horizontal_final.png" alt="el-town" className="admin-login-logo mx-auto" />
            <h1 className="text-2xl font-black text-qoin-main tracking-tight mt-5 mb-2">管理する町内会を選択</h1>
            <p className="text-gray-500 font-bold text-xs">役員として所属している町内会・自治会を選んでください</p>
          </div>

          <div className="space-y-3">
            {adminMemberships.map((membership) => (
              <button
                key={membership.adminId}
                type="button"
                onClick={() => selectAdminMembership(membership)}
                className="w-full rounded-2xl border-2 border-sky-100 bg-sky-50 px-5 py-4 text-left transition hover:border-qoin-main hover:bg-white focus:outline-none focus:ring-2 focus:ring-sky-200"
              >
                <span className="flex items-center justify-between gap-4">
                  <span>
                    <strong className="block text-base font-black text-gray-800">{membership.town.name}</strong>
                    <small className="mt-1 block font-bold text-gray-500">役職：{membership.role}</small>
                  </span>
                  <i className="fas fa-chevron-right text-qoin-main" aria-hidden="true"></i>
                </span>
              </button>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                setAdminMemberships([]);
                setTown(null);
                setView('login');
              }}
              className="text-sm font-bold text-gray-500 hover:text-gray-700"
            >
              ログアウトして戻る
            </button>
          </div>
        </div>
        <div className="absolute top-0 left-0 w-full h-64 bg-qoin-main rounded-b-[4rem] z-0"></div>
      </div>
    );
  }

  if (view === 'dashboard' && town) {
    return (
      <div className="bg-[#e4e4e4] min-h-screen font-sans flex flex-col">
        <div className="admin-session-bar bg-qoin-gray_dark text-center text-white text-sm z-50 relative shadow-md">
           <span className="admin-session-town font-bold text-gray-300"><i className="fas fa-map-marker-alt text-qoin-main"></i><span>{town.name}</span><small>(el-town管理機能)</small></span>
           <div className="admin-session-actions">
             <a 
               href="/"
               className="admin-session-button bg-gray-800 hover:bg-gray-700 border border-gray-600"
             >
               <i className="fas fa-home"></i><span>トップ</span>
             </a>
             {adminMemberships.length > 1 && (
               <button
                 type="button"
                 className="admin-session-button bg-gray-700 hover:bg-gray-600"
                 onClick={() => setView('select_town')}
               >
                 <i className="fas fa-repeat"></i><span>町内会切替</span>
               </button>
             )}
             <HelpCenter audience="admin" className="admin-session-button admin-session-help" />
             <button 
               className="admin-session-button bg-gray-700 hover:bg-gray-600"
               onClick={async () => {
                 await supabase.auth.signOut();
                 setView('login');
                 setTown(null);
                 setAdminMemberships([]);
               }}
             >
               <i className="fas fa-right-from-bracket"></i><span>ログアウト</span>
             </button>
           </div>
        </div>

        <div className="flex-1 flex justify-center items-start pt-0 md:pt-10 pb-10 relative">
          <div className="w-full max-w-5xl">
            <AdminView townId={town.id} townName={town.name} />
            <div className="fixed bottom-6 right-8 z-50 opacity-70 hidden md:flex flex-col items-end pointer-events-none">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ログイン画面
  return (
    <div className="bg-[#f0f2f5] min-h-screen font-sans flex flex-col items-center justify-center p-4 relative">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 p-8 pb-10">
        <div className="text-center mb-8 flex flex-col items-center">
          <img src="/assets/logo_horizontal_final.png" alt="el-town" className="admin-login-logo" />
          <p className="text-gray-500 font-bold text-sm">el-town管理機能</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-5">
          {loginError && (
            <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl mb-4 border border-red-200">
              {loginError}
            </div>
          )}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">メールアドレス</label>
            <input 
              type="email" 
              value={loginEmail}
              onChange={e => setLoginEmail(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-qoin-main focus:ring-2 focus:ring-sky-100 transition font-bold text-gray-700"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">パスワード</label>
            <input 
              type="password" 
              value={loginPassword}
              onChange={e => setLoginPassword(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-qoin-main focus:ring-2 focus:ring-sky-100 transition font-bold text-gray-700"
              required
            />
          </div>
          <button 
            type="submit" 
            disabled={isLoggingIn}
            className="w-full bg-qoin-main text-white font-black py-4 rounded-xl shadow-lg hover:bg-qoin-main_hover transition disabled:opacity-50 flex items-center justify-center cursor-pointer mt-2"
          >
            {isLoggingIn ? <i className="fas fa-spinner fa-spin"></i> : '管理機能へログイン'}
          </button>

          <div className="text-center mt-3">
            <button 
              type="button" 
              onClick={() => setView('forgot_password')} 
              className="text-xs font-bold text-gray-500 hover:text-qoin-main transition"
            >
              パスワードを忘れた方はこちら
            </button>
          </div>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-4">
           <button
             type="button"
             onClick={() => setView('signup')}
             className="text-sm font-bold text-qoin-main hover:text-qoin-main_hover transition group flex items-center justify-center w-full cursor-pointer bg-sky-50 py-3 rounded-xl border border-sky-100"
           >
             <i className="fas fa-house-circle-check mr-2"></i>
             新規の町内会・自治会を登録する
           </button>
           
           <Link href="/" className="inline-flex items-center justify-center text-sm font-bold text-gray-500 hover:text-gray-700 transition group cursor-pointer bg-gray-50 px-6 py-3 rounded-xl border border-gray-200 w-full mb-2">
             <i className="fas fa-arrow-left mr-2 text-gray-400 group-hover:text-gray-600 transition-colors"></i>
             トップメニューへ戻る
           </Link>
        </div>
      </div>
      {/* 背景の装飾 */}
      <div className="absolute top-0 left-0 w-full h-64 bg-qoin-main rounded-b-[4rem] z-0"></div>
    </div>
  );
}
