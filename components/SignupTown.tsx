"use client";

import React, { useState } from "react";
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

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (
      !townName.trim() ||
      !postalCode.trim() ||
      !memberScale.trim() ||
      !adminRole.trim() ||
      !adminName.trim() ||
      !adminEmail.trim() ||
      !password ||
      !confirmPassword
    ) {
      setError("町内会・自治会名、郵便番号、役職、お名前、メールID、町内会規模、パスワード、確認用パスワードを入力してください。");
      return;
    }

    if (password.length < 8 || countPasswordCategories(password) < 3) {
      setError("パスワードは、英大文字・英小文字・数字・記号のうち3種類以上を組み合わせ、8文字以上で設定してください。");
      return;
    }

    if (password !== confirmPassword) {
      setError("確認用パスワードが一致しません。同じパスワードを入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      const email = adminEmail.trim().toLowerCase();
      let { data: { session } } = await supabase.auth.getSession();
      if (session?.user && String(session.user.email || '').toLowerCase() !== email) {
        throw new Error("ログイン中のメールアドレスが登録内容と異なります。ログアウトしてからお試しください。");
      }
      if (!session) {
        // The confirmation link may open in another browser, so try the
        // confirmed account before creating a new Auth user.
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInData.session) {
          session = signInData.session;
        } else if (signInError?.code === 'email_not_confirmed') {
          throw new Error("確認メールのリンクからメール認証を完了し、同じメールアドレスとパスワードで再入力してください。");
        } else if (!signInError || signInError.code === 'invalid_credentials') {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { name: adminName.trim(), role: adminRole.trim() },
              emailRedirectTo: `${window.location.origin}/admin?mode=signup`,
            },
          });
          if (signUpError) throw signUpError;
          session = signUpData.session;
        } else {
          throw signInError;
        }
      }
      if (!session?.access_token) {
        throw new Error("確認メールのリンクからメール認証を完了し、この画面で登録内容を再入力してください。");
      }
      const response = await fetch('/api/admin/signup-town', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ townName, postalCode, memberScale, adminRole, adminName, adminEmail: email }),
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

        <form onSubmit={handleSubmit} className="signup-form">
          {error && <div className="form-alert"><i className="fas fa-circle-exclamation" /> {error}</div>}

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

          <label>
            <span>メールID</span>
            <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@example.com" required />
          </label>

          <label>
            <span>ログインパスワード</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8文字以上" required />
            <small className="signup-password-hint">
              英大文字・英小文字・数字・記号のうち3種類以上を組み合わせてください。
            </small>
          </label>

          <label>
            <span>ログインパスワード（確認用）</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="同じパスワードを再入力"
              required
            />
          </label>

          <button type="submit" className="el-primary-action" disabled={submitting}>
            {submitting ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-check" /> 登録して開始</>}
          </button>
          <button type="button" className="el-secondary-action" onClick={onCancel}>キャンセル</button>
        </form>
      </section>
    </main>
  );
}
