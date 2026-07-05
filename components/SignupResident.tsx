"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SignupResidentProps = {
  sessionUser?: any;
  onComplete?: () => void;
  onCancel?: () => void;
};

export default function SignupResident({ sessionUser, onComplete, onCancel }: SignupResidentProps) {
  const [fullName, setFullName] = useState(sessionUser?.user_metadata?.name || "");
  const [townCode, setTownCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!sessionUser?.id) {
      setError("ログイン情報を確認できません。LINEログイン後にもう一度お試しください。");
      return;
    }
    if (!fullName.trim() || !townCode.trim()) {
      setError("お名前と招待コードを入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      const { data: town, error: townError } = await supabase
        .from("neighborhoods")
        .select("id, name")
        .eq("invite_token", townCode.trim())
        .single();
      if (townError || !town) throw new Error("招待コードに一致する町内会が見つかりません。");

      const { error: rosterError } = await supabase.from("resident_rosters").insert({
        neighborhood_id: town.id,
        full_name: fullName.trim(),
        address: address.trim() || null,
        phone: phone.trim() || null,
        user_auth_id: sessionUser.id,
        line_display_name: sessionUser?.user_metadata?.name || null,
        status: "active",
      });
      if (rosterError) throw rosterError;

      onComplete?.();
    } catch (err: any) {
      setError(err.message || "会員登録に失敗しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="signup-screen">
      <section className="signup-panel">
        <div className="signup-brand">
          <img src="/logo_horizontal_final.png" alt="el-town" />
          <p>会員情報を連携</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          {error && <div className="form-alert"><i className="fas fa-circle-exclamation" /> {error}</div>}

          <label>
            <span>お名前</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="例：山田 花子" required />
          </label>

          <label>
            <span>招待コード</span>
            <input value={townCode} onChange={(e) => setTownCode(e.target.value)} placeholder="役員から案内されたコード" required />
          </label>

          <label>
            <span>住所・班など</span>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="例：1区3班" />
          </label>

          <label>
            <span>電話番号</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="任意" />
          </label>

          <button type="submit" className="el-primary-action" disabled={submitting}>
            {submitting ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-link" /> 連携する</>}
          </button>
          {onCancel && <button type="button" className="el-secondary-action" onClick={onCancel}>戻る</button>}
        </form>
      </section>
    </main>
  );
}
