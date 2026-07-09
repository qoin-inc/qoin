"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SignupTownProps = {
  onComplete: (town: { id: number; name: string }) => void;
  onCancel: () => void;
};

const memberScaleOptions = [
  "500世帯未満",
  "500世帯～1000世帯",
  "1000世帯～5000世帯",
  "5000世帯以上",
];

const memberScaleToHouseholds = (scale: string) => {
  if (scale === "500世帯未満") return 499;
  if (scale === "500世帯～1000世帯") return 1000;
  if (scale === "1000世帯～5000世帯") return 5000;
  if (scale === "5000世帯以上") return 5001;
  return null;
};

const isMissingColumnError = (error: any, columnName: string) => {
  const message = String(error?.message || "");
  return message.includes(columnName) && (message.includes("schema cache") || message.includes("column"));
};

export default function SignupTown({ onComplete, onCancel }: SignupTownProps) {
  const [townName, setTownName] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [memberScale, setMemberScale] = useState("");
  const [adminRole, setAdminRole] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [password, setPassword] = useState("");
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
      password.length < 8
    ) {
      setError("町内会・自治会名、郵便番号、役職、お名前、メールID、町内会規模、8文字以上のパスワードを入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail.trim(),
        password,
        options: { data: { name: adminName.trim(), role: adminRole.trim() } },
      });
      if (authError) throw authError;

      const userId = authData.user?.id;
      const inviteToken = crypto.randomUUID();
      const baseTownPayload = {
        name: townName.trim(),
        postal_code: postalCode.trim(),
        households: memberScaleToHouseholds(memberScale),
        admin_email: adminEmail.trim(),
        admin_name: adminName.trim(),
        admin_auth_id: userId || null,
        invite_token: inviteToken,
      };
      let townInsertResult = await supabase
        .from("neighborhoods")
        .insert({
          ...baseTownPayload,
          member_scale: memberScale,
        })
        .select("id, name")
        .single();

      if (isMissingColumnError(townInsertResult.error, "member_scale")) {
        townInsertResult = await supabase
          .from("neighborhoods")
          .insert(baseTownPayload)
          .select("id, name")
          .single();
      }

      const { data: town, error: townError } = townInsertResult;
      if (townError) throw townError;

      if (userId && town) {
        const adminPayload = {
          neighborhood_id: town.id,
          admin_auth_id: userId,
          admin_email: adminEmail.trim(),
          admin_name: adminName.trim(),
          status: "active",
        };
        let adminInsertResult = await supabase.from("neighborhood_admins").insert({
          ...adminPayload,
          admin_role: adminRole.trim(),
        });

        if (isMissingColumnError(adminInsertResult.error, "admin_role")) {
          adminInsertResult = await supabase.from("neighborhood_admins").insert(adminPayload);
        }

        const { error: adminError } = adminInsertResult;
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
          <img src="/assets/logo_horizontal_final.png" alt="el-town" />
          <p>町内会・自治会を新しく登録</p>
        </div>

        <form onSubmit={handleSubmit} className="signup-form">
          {error && <div className="form-alert"><i className="fas fa-circle-exclamation" /> {error}</div>}

          <label>
            <span>町内会・自治会名</span>
            <input value={townName} onChange={(e) => setTownName(e.target.value)} placeholder="例：七日町自治会" required />
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
            <input value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="例：山田 太郎" required />
          </label>

          <label>
            <span>メールID</span>
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
