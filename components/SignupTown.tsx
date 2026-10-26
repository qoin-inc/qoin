"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SignupTownProps = {
  onComplete: (town: { id: number; name: string }) => void;
  onCancel: () => void;
  initialEmail?: string;
};

const memberScaleOptions = [
  "500世帯未満",
  "500世帯～1000世帯",
  "1000世帯～5000世帯",
  "5000世帯以上",
];

const countPasswordCategories = (value: string) => [
  /[A-Z]/.test(value),
  /[a-z]/.test(value),
  /[0-9]/.test(value),
  /[^A-Za-z0-9]/.test(value),
].filter(Boolean).length;

export default function SignupTown({ onComplete, onCancel, initialEmail = "" }: SignupTownProps) {
  const [authReady, setAuthReady] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [townName, setTownName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [memberScale, setMemberScale] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const acceptSession = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      if (!active || !session?.user?.email_confirmed_at || !session.user.email) return;
      const email = session.user.email.toLowerCase();
      setVerifiedEmail(email);
      setAdminEmail(email);
      setNotice("");
    };
    supabase.auth.getSession().then(({ data }) => acceptSession(data.session))
      .catch(() => setError("ログイン状態を確認できませんでした。ページを再読み込みしてください。"))
      .finally(() => { if (active) setAuthReady(true); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'SIGNED_OUT') setVerifiedEmail("");
      else acceptSession(session);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const handleAuthSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setNotice("");
    const email = adminEmail.trim().toLowerCase();
    if (!email || !password) {
      setError("メールアドレスとパスワードを入力してください。");
      return;
    }
    setSubmitting(true);
    try {
      if (authMode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (data.session?.user.email_confirmed_at) {
          setVerifiedEmail(email);
          setPassword("");
          setConfirmPassword("");
        } else if (signInError?.code === 'email_not_confirmed') {
          setError("確認メールのリンクでメール認証を完了してください。");
        } else if (signInError?.code === 'invalid_credentials') {
          setError("メールアドレスまたはパスワードが一致しません。登録済みの方はパスワードを再設定してください。");
        } else if (signInError) {
          throw signInError;
        } else {
          setError("ログインを確認できませんでした。もう一度お試しください。");
        }
        return;
      }
      if (password.length < 8 || countPasswordCategories(password) < 3) {
        setError("新規登録のパスワードは、英大文字・英小文字・数字・記号のうち3種類以上を組み合わせ、8文字以上で設定してください。");
        return;
      }
      if (password !== confirmPassword) {
        setError("確認用パスワードが一致しません。同じパスワードを入力してください。");
        return;
      }
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/admin?mode=signup` },
      });
      if (signUpError) throw signUpError;
      if (signUpData.session?.user.email_confirmed_at) {
        setVerifiedEmail(email);
        setPassword("");
        setConfirmPassword("");
      } else {
        setNotice("新規登録の場合は確認メールのリンクで認証してください。メールが届かない場合は、登録済みアカウントのログインや迷惑メールフォルダーも確認してください。");
      }
    } catch (err: any) {
      setError(err.message || "メール認証を開始できませんでした。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (
      !verifiedEmail ||
      !townName.trim() ||
      !postalCode.trim() ||
      !memberScale.trim() ||
      !adminRole.trim() ||
      !adminName.trim()
    ) {
      setError("メール認証を完了し、町内会・自治会名、郵便番号、規模、役職、お名前を入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !session.user.email_confirmed_at
        || String(session.user.email || '').toLowerCase() !== verifiedEmail) {
        throw new Error("メール認証済みのログインを確認できません。もう一度ログインしてください。");
      }
      const response = await fetch('/api/admin/signup-town', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ townName, postalCode, memberScale, adminRole, adminName, adminEmail: verifiedEmail }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || '町内会の登録に失敗しました。');
      onComplete(result.town);
    } catch (err: any) {
      setError(err.message || "町内会の登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="signup-screen">
      <section className="signup-panel">
        <div className="signup-brand">
          <img src="/assets/logo_horizontal_final.png" alt="el-town" />
          <p>町内会・自治会を新しく登録</p>
          <a
            href="/manual/admin-signup"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              marginTop: 10,
              color: "#087dac",
              fontSize: 12,
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            <i className="fas fa-book-open" aria-hidden="true" />
            申し込み手順を見る
            <i className="fas fa-arrow-up-right-from-square" aria-hidden="true" />
          </a>
        </div>

        {!authReady ? <p role="status">ログイン状態を確認しています…</p> : (
          <form onSubmit={verifiedEmail ? handleSubmit : handleAuthSubmit} className="signup-form">
            {error && <div className="form-alert"><i className="fas fa-circle-exclamation" /> {error}</div>}
            {notice && <p role="status">{notice}</p>}
            {verifiedEmail ? (
              <>
                <p>メール認証済み: {verifiedEmail}</p>
                <p>町内会情報を入力すると登録が完了します。</p>
                <label>
                  <span>町内会・自治会名</span>
                  <input value={townName} onChange={(e) => setTownName(e.target.value)} placeholder="例：エルタウン町内会" required />
                </label>
                <label>
                  <span>郵便番号</span>
                  <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="例：100-0001" required />
                </label>
                <label>
                  <span>会員世帯数</span>
                  <select value={memberScale} onChange={(e) => setMemberScale(e.target.value)} required>
                    <option value="">選択してください</option>
                    {memberScaleOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>役職</span>
                  <input value={adminRole} onChange={(e) => setAdminRole(e.target.value)} placeholder="例：会長" required />
                </label>
                <label>
                  <span>お名前</span>
                  <input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="例：エルタウン太郎" required />
                </label>
              </>
            ) : (
              <>
                <p>先にメールアドレスを認証します。町内会情報は認証後に一度だけ入力してください。</p>
                <div role="group" aria-label="メールアカウントの登録状況" style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="el-secondary-action" aria-pressed={authMode === 'login'} onClick={() => { setAuthMode('login'); setError(""); setNotice(""); }}>登録済みの方</button>
                  <button type="button" className="el-secondary-action" aria-pressed={authMode === 'signup'} onClick={() => { setAuthMode('signup'); setError(""); setNotice(""); }}>初めての方</button>
                </div>
                <label>
                  <span>メールID</span>
                  <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@example.com" required />
                </label>
                <label>
                  <span>ログインパスワード</span>
                  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8文字以上" required />
                  {authMode === 'signup' && <small className="signup-password-hint">新規登録は英大文字・英小文字・数字・記号のうち3種類以上、8文字以上で設定してください。</small>}
                </label>
                {authMode === 'signup' && <label>
                  <span>ログインパスワード（確認用）</span>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="同じパスワードを入力" required />
                </label>}
                {authMode === 'login' && <a href="/admin?mode=forgot_password">パスワードを忘れた方はこちら</a>}
              </>
            )}
            <button type="submit" className="el-primary-action" disabled={submitting}>
              {submitting ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> {verifiedEmail ? "登録して開始" : authMode === 'login' ? "ログインして次へ" : "確認メールを送信"}</>}
            </button>
            <button type="button" className="el-secondary-action" onClick={onCancel}>キャンセル</button>
          </form>
        )}
      </section>
    </main>
  );
}
