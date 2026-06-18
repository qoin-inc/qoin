'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminView from '@/components/AdminView';
import SignupTown from '@/components/SignupTown';
import { supabase } from '@/lib/supabaseClient';

export default function AdminPage() {
  const [view, setView] = useState<'login' | 'signup' | 'join' | 'invite' | 'dashboard' | 'forgot_password' | 'update_password'>('login');
  const [town, setTown] = useState<{id: number, name: string} | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 招待URL用ステート
  const [inviteTokenParam, setInviteTokenParam] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteConfirmPassword, setInviteConfirmPassword] = useState('');
  const [joinConfirmPassword, setJoinConfirmPassword] = useState('');

  // セッションがあれば自動ログイン
  useEffect(() => {
    const init = async () => {
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
        await supabase.auth.signOut();
        const params = new URLSearchParams(window.location.search);
        setInviteTokenParam(params.get('token') || '');
        setView('invite');
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
        // 複数管理者テーブルから所属する町内会・自治会を検索（複数ヒットエラー回避のため配列で取得）
        const { data: adminRecords } = await supabase
          .from('neighborhood_admins')
          .select('status, neighborhood_id, neighborhoods(id, name)')
          .eq('admin_auth_id', session.user.id)
          .limit(1);

        let adminRecord = adminRecords && adminRecords.length > 0 ? adminRecords[0] : null;

        // 【自己修復フェーズ】旧テーブル(neighborhoods)にデータがあるが新テーブルへ移行されていない場合、その場で移行する
        if (!adminRecord) {
          const { data: oldTownData } = await supabase.from('neighborhoods').select('*').eq('admin_auth_id', session.user.id).limit(1);
          if (oldTownData && oldTownData.length > 0) {
            const oldTown = oldTownData[0];
            await supabase.from('neighborhood_admins').insert({
               neighborhood_id: oldTown.id,
               admin_auth_id: session.user.id,
               admin_email: oldTown.admin_email || session.user.email,
               admin_name: oldTown.admin_name || '初期管理者',
               status: 'active'
            });
            const { data: retryRecords } = await supabase.from('neighborhood_admins').select('status, neighborhood_id, neighborhoods(id, name)').eq('admin_auth_id', session.user.id).limit(1);
            if (retryRecords && retryRecords.length > 0) adminRecord = retryRecords[0];
          }
        }

        if (adminRecord) {
          if (adminRecord.status === 'waiting_approval') {
            setLoginError('管理者アカウントは現在承認待ちです。代表者（最初の役員）の承認をお待ちください。');
            await supabase.auth.signOut();
            return;
          }
          if (adminRecord.status === 'rejected') {
            setLoginError('管理者アカウントの登録申請が却下されました。');
            await supabase.auth.signOut();
            return;
          }
        }

        if (adminRecord && adminRecord.status === 'active' && adminRecord.neighborhoods) {
          // 単一のオブジェクトとして取り出す (SupabaseのJOIN仕様による)
          const townData = Array.isArray(adminRecord.neighborhoods) 
             ? adminRecord.neighborhoods[0] 
             : adminRecord.neighborhoods;
          if (townData) {
            setTown(townData as any);
            setView('dashboard');
          }
        }
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

      const { data: adminRecords, error: adminError } = await supabase
        .from('neighborhood_admins')
        .select('status, neighborhood_id, neighborhoods(id, name)')
        .eq('admin_auth_id', authData.user?.id)
        .limit(1);

      let adminRecord = adminRecords && adminRecords.length > 0 ? adminRecords[0] : null;
      let debugMsg = `user:${authData.user?.id}`;

      // 【自己修復フェーズ】旧テーブル(neighborhoods)にデータがあるが新テーブルへ移行されていない場合、その場で移行する
      if (!adminRecord) {
        const { data: oldTownData, error: oldError } = await supabase.from('neighborhoods').select('*').eq('admin_auth_id', authData.user?.id).limit(1);
        debugMsg += `, oldFound:${oldTownData?.length || 0}, oldErr:${oldError?.message||'none'}`;

        if (oldTownData && oldTownData.length > 0) {
          const oldTown = oldTownData[0];
          const { error: insErr } = await supabase.from('neighborhood_admins').insert({
             neighborhood_id: oldTown.id,
             admin_auth_id: authData.user?.id,
             admin_email: oldTown.admin_email || loginEmail,
             admin_name: oldTown.admin_name || '初期管理者',
             status: 'active'
          });
          debugMsg += `, insErr: ${insErr?.message || 'none'}`;

          const { data: retryRecords, error: retryErr } = await supabase.from('neighborhood_admins').select('status, neighborhood_id, neighborhoods(id, name)').eq('admin_auth_id', authData.user?.id).limit(1);
          debugMsg += `, retErr: ${retryErr?.message || 'none'}`;
          
          if (retryRecords && retryRecords.length > 0) adminRecord = retryRecords[0];
        }
      }

      if (adminRecord) {
        if (adminRecord.status === 'waiting_approval') {
          await supabase.auth.signOut();
          throw new Error('管理者アカウントは現在承認待ちです。代表者（最初の役員）の承認をお待ちください。');
        }
        if (adminRecord.status === 'rejected') {
          await supabase.auth.signOut();
          throw new Error('管理者アカウントの登録申請が却下されました。');
        }
      }

      if (!adminRecord || adminRecord.status !== 'active' || !adminRecord.neighborhoods) {
        throw new Error(`町内会・自治会情報が見つかりません。入力したメールアドレスの登録がないか、退会済みの可能性があります。(${debugMsg})`);
      }

      const townData = Array.isArray(adminRecord.neighborhoods) 
         ? adminRecord.neighborhoods[0] 
         : adminRecord.neighborhoods;
         
      setTown(townData as any);
      setView('dashboard');
    } catch (err: any) {
      console.error(err);
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
      // パスワード制限チェック
      if (loginPassword !== inviteConfirmPassword) {
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

      // 1. tokenから町内会・自治会を探す
      const { data: townData, error: townError } = await supabase
        .from('neighborhoods')
        .select('id, name')
        .eq('invite_token', inviteTokenParam)
        .single();
        
      if (townError || !townData) {
        throw new Error('町内会・自治会情報が見つかりません。招待URLが間違っているか無効になっています。');
      }

      // 2. Authでユーザーを新規作成、もし既に登録済みならログインを試みる
      let authUserId;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: loginEmail,
        password: loginPassword,
      });

      if (authError) {
        if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
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

      // 3. 役員テーブルへ追加（承認待ちステータス 'waiting_approval' に設定）
      const { error: insertError } = await supabase
        .from('neighborhood_admins')
        .insert({
          neighborhood_id: townData.id,
          admin_auth_id: authUserId,
          admin_email: loginEmail,
          admin_name: inviteName,
          status: 'waiting_approval'
        });

      if (insertError) {
         // UNIQUE制約等で既に登録済みの場合はエラーになっても握りつぶして合流させる
         if (!insertError.message.includes('duplicate key value')) {
            throw insertError;
         }
      }

      // 4. ダッシュボードへ
      setTown(townData);
      setView('dashboard');
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
    return (
      <div className="bg-[#f0f2f5] min-h-screen font-sans flex flex-col items-center justify-center p-4 relative">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative z-10 p-8 pb-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-qoin-main tracking-tight mb-2">役員として合流する</h1>
            <p className="text-gray-500 font-bold text-xs">ご自身のお名前とパスワードを設定してください。</p>
          </div>

          <form onSubmit={handleInviteSubmit} className="space-y-5">
            {loginError && (
              <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl mb-4 border border-red-200">
                {loginError}
              </div>
            )}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">お名前（または役職名）</label>
              <input 
                type="text" 
                value={inviteName}
                onChange={e => setInviteName(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-qoin-main focus:ring-2 focus:ring-sky-100 transition font-bold text-gray-700"
                placeholder="例：副会長 山田"
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
                value={inviteConfirmPassword}
                onChange={e => setInviteConfirmPassword(e.target.value)}
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

  if (view === 'dashboard' && town) {
    return (
      <div className="bg-[#e4e4e4] min-h-screen font-sans flex flex-col">
        <div className="bg-qoin-gray_dark p-3 text-center text-white text-sm z-50 relative shadow-md flex justify-between items-center px-6">
           <span className="font-bold text-gray-300"><i className="fas fa-map-marker-alt mr-2 text-qoin-main"></i>{town.name} <span className="ml-2 text-xs opacity-70">(el-town管理機能)</span></span>
           <div className="flex gap-2 md:gap-4 items-center">
             <a 
               href="/"
               className="px-3 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-xs font-bold transition text-gray-300 flex items-center shadow-sm cursor-pointer"
             >
               <i className="fas fa-home mr-1"></i><span className="hidden md:inline">トップへ</span>
             </a>
             <button 
               className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-bold transition text-gray-300 cursor-pointer"
               onClick={async () => {
                 await supabase.auth.signOut();
                 setView('login');
                 setTown(null);
               }}
             >
               ログアウト
             </button>
           </div>
        </div>

        <div className="flex-1 flex justify-center items-start pt-0 md:pt-10 pb-10 relative">
          <div className="w-full max-w-5xl">
            <AdminView townId={town.id} townName={town.name} />
            <div className="fixed bottom-6 right-8 z-50 opacity-70 hidden md:flex flex-col items-end pointer-events-none">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src="/logo_horizontal_final.png" alt="el-town" className="h-5 w-auto object-contain drop-shadow-sm mb-1" />
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
          <img src="/logo_horizontal_final.png" alt="el-town" className="h-14 w-auto object-contain drop-shadow-sm mb-4" />
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
             onClick={() => setView('join')}
             className="text-sm font-bold text-orange-600 hover:text-orange-700 transition group flex items-center justify-center w-full cursor-pointer bg-orange-50 py-3 rounded-xl border border-orange-100"
           >
             <i className="fas fa-envelope-open-text mr-2"></i>
             代表者から招待された方はこちら
           </button>
           
           <button 
             type="button"
             onClick={() => setView('signup')}
             className="text-sm font-bold text-qoin-main hover:text-qoin-main_hover transition group flex items-center justify-center w-full cursor-pointer mt-4"
           >
             はじめての町内会・自治会を開設（新規登録）
             <i className="fas fa-chevron-right ml-1 text-xs transition-transform group-hover:translate-x-1"></i>
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
