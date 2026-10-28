"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isVerifiedStagingLineUser } from "@/lib/lineResidentAuth";

type SignupResidentProps = {
  sessionUser?: any;
  onComplete?: () => void;
  onCancel?: () => void;
};

export default function SignupResident({ sessionUser, onComplete, onCancel }: SignupResidentProps) {
  const [fullName, setFullName] = useState("");
  const [kanaName, setKanaName] = useState("");
  const [registrantType, setRegistrantType] = useState<"primary" | "family">("primary");
  const [memberName, setMemberName] = useState("");
  const [memberKanaName, setMemberKanaName] = useState("");
  const [townName, setTownName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [addressLine3, setAddressLine3] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!sessionUser?.id) {
      setError("ログイン情報を確認できません。LINEログイン後にもう一度お試しください。");
      return;
    }
    if (!fullName.trim() || !kanaName.trim() || !townName.trim() || !postalCode.trim() || !addressLine2.trim()
      || (registrantType === "family" && (!memberName.trim() || !memberKanaName.trim()))) {
      setError("町内会名、住所、世帯主の氏名・カナを入力してください。家族が利用する場合は家族本人の氏名・カナも必要です。");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token || !isVerifiedStagingLineUser(session.user)) {
        throw new Error("検証用LINEログインを確認できません。もう一度ログインしてください。");
      }
      const response = await fetch("/api/resident/roster", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ townName, fullName, kanaName, postalCode, addressLine2, addressLine3,
          registrantType, memberName: registrantType === "family" ? memberName : "",
          memberKanaName: registrantType === "family" ? memberKanaName : "" }),
        cache: "no-store",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "会員情報を連携できませんでした。");
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
            <span>町内会名</span>
            <input value={townName} onChange={(e) => setTownName(e.target.value)} placeholder="例：エルタウン町内会" required />
          </label>

          <label>
            <span>郵便番号</span>
            <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="例：1000001" inputMode="numeric" required />
          </label>

          <label>
            <span>住所２</span>
            <input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} placeholder="例：1丁目2-3" required />
          </label>

          <label>
            <span>住所３</span>
            <input value={addressLine3} onChange={(e) => setAddressLine3(e.target.value)} placeholder="建物名・部屋番号など（あれば）" />
          </label>

          <label>
            <span>世帯主のお名前</span>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="例：エルタウン太郎" required />
          </label>

          <label>
            <span>世帯主のカナ氏名</span>
            <input value={kanaName} onChange={(e) => setKanaName(e.target.value)} placeholder="例：エルタウン タロウ" required />
          </label>

          <label>
            <span>LINEを利用する方</span>
            <select value={registrantType} onChange={(e) => setRegistrantType(e.target.value as "primary" | "family")}>
              <option value="primary">世帯主本人</option>
              <option value="family">家族</option>
            </select>
          </label>

          {registrantType === "family" && <>
            <div className="signup-form-section-note">
              <strong>家族の方が利用する場合</strong>
              <small>LINEの表示名ではなく、利用する家族本人の正式な氏名を入力してください。</small>
            </div>
            <label>
              <span>家族の方のお名前</span>
              <input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="例：エルタウン花子" required />
            </label>
            <label>
              <span>家族の方のカナ氏名</span>
              <input value={memberKanaName} onChange={(e) => setMemberKanaName(e.target.value)} placeholder="例：エルタウン ハナコ" required />
            </label>
          </>}

          <button type="submit" className="el-primary-action" disabled={submitting}>
            {submitting ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-link" /> 連携する</>}
          </button>
          {onCancel && <button type="button" className="el-secondary-action" onClick={onCancel}>戻る</button>}
        </form>
      </section>
    </main>
  );
}
