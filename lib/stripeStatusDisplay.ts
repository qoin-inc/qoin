type AccountStatus = {
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements?: {
    currently_due?: string[] | null;
    past_due?: string[] | null;
    pending_verification?: string[] | null;
    disabled_reason?: string | null;
    errors?: Array<{ requirement: string; reason: string }> | null;
  } | null;
};

export type StripeStatusDisplay = {
  label: string;
  message: string;
  reasons: string[];
};

const fieldLabels: Record<string, string> = {
  business_type: "組織区分",
  "business_profile.name": "町内会・自治会名",
  "business_profile.url": "Webサイト",
  "business_profile.mcc": "業種",
  "business_profile.product_description": "サービス内容",
  "business_profile.support_email": "問い合わせメール",
  "business_profile.support_phone": "問い合わせ電話番号",
  "company.name": "登記・規約上の町内会・自治会名",
  "company.tax_id": "法人番号・税務情報",
  external_account: "入金先銀行口座",
  "tos_acceptance.date": "Stripe利用規約への同意",
  "tos_acceptance.ip": "Stripe利用規約への同意確認",
};

function fieldLabel(field: string) {
  if (fieldLabels[field]) return fieldLabels[field];
  if (field.includes("verification.document")) return "本人確認書類";
  if (field.startsWith("person_") || field.includes("representative")) return "代表者・本人確認情報";
  if (field.startsWith("company.address")) return "町内会・自治会所在地";
  return field;
}

// Display only facts returned by Stripe; submission alone does not prove review.
export function stripeStatusDisplay(account: AccountStatus): StripeStatusDisplay {
  const requirements = account.requirements;
  const due = [...new Set([...(requirements?.past_due || []), ...(requirements?.currently_due || [])])];
  const pending = requirements?.pending_verification || [];
  const errors = requirements?.errors || [];
  const disabled = requirements?.disabled_reason || "";
  const reasons: string[] = [];
  if (due.length) reasons.push(`追加入力・提出が必要な項目：${[...new Set(due.map(fieldLabel))].join("、")}`);
  if (pending.length) reasons.push(`Stripeが確認中の項目：${[...new Set(pending.map(fieldLabel))].join("、")}`);
  for (const error of errors) reasons.push(`${fieldLabel(error.requirement)}：${error.reason}`);
  const disabledLabels: Record<string, string> = {
    "requirements.past_due": "必要情報の提出期限を過ぎているため、利用が制限されています。",
    "requirements.pending_verification": "提出された情報をStripeが確認しています。",
    "under_review": "Stripeがアカウントを審査しています。",
    "rejected.fraud": "Stripeにより不正利用を理由に利用が拒否されています。",
    "rejected.terms_of_service": "Stripeの利用規約に関する理由で利用が拒否されています。",
    "rejected.listed": "Stripeの審査により利用が拒否されています。詳細はStripe側で確認してください。",
    "rejected.other": "Stripeの審査により利用が拒否されています。詳細はStripe側で確認してください。",
    "listed": "Stripe側でアカウントに制限が設定されています。詳細はStripe側で確認してください。",
    "platform_paused": "プラットフォームにより利用が一時停止されています。",
    "action_required.requested_capabilities": "利用する決済機能の設定について対応が必要です。",
  };
  if (disabled) reasons.push(disabledLabels[disabled] || `Stripeから利用制限の理由が返されています（${disabled}）。詳細はStripe側で確認してください。`);
  const active = account.charges_enabled === true && account.payouts_enabled === true;
  const restricted = Boolean(disabled && !["requirements.past_due", "requirements.pending_verification", "under_review"].includes(disabled));
  if (restricted) return { label: "Stripe利用制限中", message: "Stripe側で対応が必要です。", reasons };
  if (due.length || errors.length || disabled === "requirements.past_due") return {
    label: "Stripe要対応",
    message: active ? "決済受付と入金・振込は有効ですが、追加の対応が必要です。" : "Stripeへの追加情報の入力・提出、または訂正が必要です。",
    reasons,
  };
  if (active) return { label: "Stripe有効", message: "決済受付と入金・振込が有効です。", reasons };
  if (pending.length || ["requirements.pending_verification", "under_review"].includes(disabled)) return {
    label: "Stripe審査中", message: "Stripeが登録情報を確認しています。", reasons,
  };
  if (account.details_submitted === false) return {
    label: "Stripe登録未完了", message: "Stripeへの登録情報の提出が完了していません。", reasons: [...reasons, "Stripe登録画面を再開し、未入力の情報と提出状況を確認してください。"],
  };
  return {
    label: "Stripe状態要確認", message: "決済受付または入金・振込がまだ有効になっていません。",
    reasons: [...reasons, "Stripeから具体的な理由は取得できていません。Stripe側の要対応事項を確認してください。"],
  };
}
