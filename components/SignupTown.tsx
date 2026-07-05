"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SignupTownProps = {
  onComplete: (town: { id: number; name: string }) => void;
  onCancel: () => void;
};

export default function SignupTown({ onComplete, onCancel }: SignupTownProps) {
  const [townName, setTownName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!townName.trim() || !adminName.trim() || !adminEmail.trim() || password.length < 8) {
      setError("町内会名、代表者名、メールアドレス、8文字以上のパスワードを入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail.trim(),
        password,
        options: { data: { name: adminName.trim() } },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      const inviteToken = crypto.randomUUID();
      const { data: town, error: townError } = await supabase
        .from("neighborhoods")
        .insert({
          name: townName.trim(),
          admin_email: adminEmail.trim(),
          admin_name: adminName.trim(),
          admin_auth_id: userId || null,
          invite_token: inviteToken,
        })
        .select("id, name")
        .single();
      if (townError) throw townError;

      if (userId && town) {
        const { error: adminError } = await supabase.from("neighborhood_admins").insert({
          neighborhood_id: town.id,
          admin_auth_id: userId,
          admin_email: adminEmail.trim(),
          admin_name: adminName.trim(),
          status: "active",
        });
        if (adminError && !adminError.message.includes("duplicate key")) throw adminError;
      }

      onComplete(town);
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
          <img src="/logo_horizontal_final.png" alt="el-town" />
          <p>町内会・自治会を新しく登録</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          {error && <div className="form-alert"><i className="fas fa-circle-exclamation" /> {error}</div>}

          <label>
            <span>町内会・自治会名</span>
            <input value={townName} onChange={(e) => setTownName(e.target.value)} placeholder="例：七日町自治会" required />
          </label>

          <label>
            <span>代表者・管理者名</span>
            <input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="例：山田 太郎" required />
          </label>

          <label>
            <span>メールアドレス</span>
            <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="admin@example.com" required />
          </label>

          <label>
            <span>ログインパスワード</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8文字以上" required />
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
