"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type SignupResidentProps = {
  sessionUser?: any;
  onComplete?: () => void;
  onCancel?: () => void;
};

const normalizeText = (value?: string | null) => String(value || "").normalize("NFKC").replace(/[\s　]+/g, "").trim();
const normalizeName = normalizeText;
const normalizePostalCode = (value?: string | null) => normalizeText(value).replace(/[^\d]/g, "");
const LINE_EMAIL_SUFFIX = "@line.eltown.local";

const rosterPrimaryName = (roster: any) => roster.full_name || `${roster.last_name || ""}${roster.first_name || ""}`;
const rosterPrimaryKana = (roster: any) => roster.kana_name || roster.full_name_kana || roster.kana || "";
const rosterPostalCode = (roster: any) => roster.postal_code || "";
const rosterAddressLine2 = (roster: any) => roster.address_line2 || roster.address2 || roster.address || "";
const rosterAddressLine3 = (roster: any) => roster.address_line3 || roster.address3 || "";
const lineUserIdFromAuthUser = (user: any) => {
  const email = String(user?.email || "");
  if (!email.endsWith(LINE_EMAIL_SUFFIX)) return "";
  return email.slice(0, -LINE_EMAIL_SUFFIX.length);
};
const withoutLineColumns = (payload: Record<string, any>) => {
  const { line_user_id, family_line_user_id_1, family_line_user_id_2, line_display_name, ...fallback } = payload;
  return fallback;
};

export default function SignupResident({ sessionUser, onComplete, onCancel }: SignupResidentProps) {
  const [fullName, setFullName] = useState("");
  const [kanaName, setKanaName] = useState("");
  const [memberName, setMemberName] = useState(sessionUser?.user_metadata?.name || "");
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
    if (!fullName.trim() || !kanaName.trim() || !memberName.trim() || !memberKanaName.trim() || !townName.trim() || !postalCode.trim() || !addressLine2.trim()) {
      setError("町内会名、住所、世帯主の氏名・カナ、登録する方の氏名・カナを入力してください。");
      return;
    }

    setSubmitting(true);
    try {
      const normalizedTownName = normalizeText(townName);
      const normalizedPostalCode = normalizePostalCode(postalCode);
      const normalizedAddressLine2 = normalizeText(addressLine2);
      const normalizedAddressLine3 = normalizeText(addressLine3);

      const { data: towns, error: townError } = await supabase
        .from("neighborhoods")
        .select("id, name")
        .limit(1000);
      if (townError) throw townError;

      const town = towns?.find((item: any) => normalizeText(item.name) === normalizedTownName);
      if (!town) throw new Error("町内会名に一致する町内会が見つかりません。名称を確認してください。");

      const normalizedInputName = normalizeName(fullName);
      const normalizedInputKana = normalizeName(kanaName);
      const lineUserId = lineUserIdFromAuthUser(sessionUser);
      const rpcResult = await supabase.rpc("link_resident_roster_by_identity", {
        p_neighborhood_id: town.id,
        p_full_name: fullName,
        p_kana_name: kanaName,
        p_postal_code: postalCode,
        p_address2: addressLine2,
        p_address3: addressLine3,
        p_line_user_id: lineUserId || null,
        p_line_display_name: sessionUser?.user_metadata?.name || null,
        p_member_name: memberName,
        p_member_kana_name: memberKanaName,
      });
      if (!rpcResult.error) {
        onComplete?.();
        return;
      }
      const rpcUnavailable = rpcResult.error.code === "PGRST202" || /link_resident_roster_by_identity|schema cache|function/i.test(String(rpcResult.error.message || ""));
      if (!rpcUnavailable) throw rpcResult.error;

      const { data: existingRosters, error: rosterLookupError } = await supabase
        .from("resident_rosters")
        .select("*")
        .eq("neighborhood_id", town.id)
        .limit(1000);
      if (rosterLookupError) throw rosterLookupError;

      const matchedRoster = existingRosters?.find((roster: any) => {
        // 世帯主情報で世帯を特定する。登録する本人の氏名・カナは別項目として保存する。
        const nameAndKanaMatched = normalizeName(rosterPrimaryName(roster)) === normalizedInputName
          && normalizeName(rosterPrimaryKana(roster)) === normalizedInputKana;

        if (!nameAndKanaMatched) return false;
        if (normalizePostalCode(rosterPostalCode(roster)) !== normalizedPostalCode) return false;
        if (normalizeText(rosterAddressLine2(roster)) !== normalizedAddressLine2) return false;
        const normalizedRosterAddressLine3 = normalizeText(rosterAddressLine3(roster));
        if ((normalizedAddressLine3 || normalizedRosterAddressLine3) && normalizedRosterAddressLine3 !== normalizedAddressLine3) return false;

        return true;
      });

      if (matchedRoster) {
        if (matchedRoster.withdrawal_status === "withdrawn") {
          throw new Error("この会員名簿は退会済みのため連携できません。役員へ確認してください。");
        }

        const primaryNameMatched = normalizeName(rosterPrimaryName(matchedRoster)) === normalizedInputName && normalizeName(rosterPrimaryKana(matchedRoster)) === normalizedInputKana;
        let updatePayload: Record<string, any> | null = null;

        if (primaryNameMatched) {
          if (matchedRoster.user_auth_id && matchedRoster.user_auth_id !== sessionUser.id) {
            const existingFamilySlot = ([1, 2] as const).find((slot) => String(matchedRoster[`family_user_auth_id_${slot}`] || "") === String(sessionUser.id));
            const availableFamilySlot = ([1, 2] as const).find((slot) => !matchedRoster[`family_user_auth_id_${slot}`] && !matchedRoster[`family_invite_token_${slot}`]);
            const familySlot = existingFamilySlot || availableFamilySlot;
            if (!familySlot) {
              throw new Error("この世帯は家族2名まで連携済みです。世帯主へ確認してください。");
            }
            updatePayload = {
              [`family_name_${familySlot}`]: memberName.trim(),
              [`family_kana_name_${familySlot}`]: memberKanaName.trim(),
              [`family_user_auth_id_${familySlot}`]: sessionUser.id,
              [`family_line_user_id_${familySlot}`]: lineUserId || null,
              [`family_invite_token_${familySlot}`]: null,
              [`family_invited_at_${familySlot}`]: null,
              [`family_withdrawal_status_${familySlot}`]: "active",
            };
          } else {
            updatePayload = {
              user_auth_id: sessionUser.id,
              line_user_id: lineUserId || null,
              line_display_name: sessionUser?.user_metadata?.name || null,
              status: "active",
            };
          }
        }

        if (!updatePayload) throw new Error("一致する会員名簿を確認できませんでした。");

        let { error: updateError } = await supabase
          .from("resident_rosters")
          .update(updatePayload)
          .eq("id", matchedRoster.id);

        if (updateError && /line_display_name|line_user_id|family_line_user_id/i.test(String(updateError.message || ""))) {
          const fallbackPayload = withoutLineColumns(updatePayload);
          const fallback = await supabase
            .from("resident_rosters")
            .update(fallbackPayload)
            .eq("id", matchedRoster.id);
          updateError = fallback.error;
        }

        if (updateError) throw updateError;
        onComplete?.();
        return;
      }

      throw new Error("入力内容に一致する世帯主の会員名簿が見つかりません。町内会名、住所、世帯主氏名・カナを確認してください。");
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
            <input value={townName} onChange={(e) => setTownName(e.target.value)} placeholder="例：東京町内会" required />
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
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="例：山田 太郎" required />
          </label>

          <label>
            <span>世帯主のカナ氏名</span>
            <input value={kanaName} onChange={(e) => setKanaName(e.target.value)} placeholder="例：ヤマダ タロウ" required />
          </label>

          <div className="signup-form-section-note">
            <strong>登録する方の本人情報</strong>
            <small>LINEの表示名ではなく、会員名簿に登録する正式な氏名を入力してください。</small>
          </div>

          <label>
            <span>登録する方のお名前</span>
            <input value={memberName} onChange={(e) => setMemberName(e.target.value)} placeholder="例：山田 花子" required />
          </label>

          <label>
            <span>登録する方のカナ氏名</span>
            <input value={memberKanaName} onChange={(e) => setMemberKanaName(e.target.value)} placeholder="例：ヤマダ ハナコ" required />
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
