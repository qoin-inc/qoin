export type InvoiceIssuer = {
  postal_code: string;
  address: string;
  company_name: string;
  phone: string;
  registration_number: string;
};

export const emptyInvoiceIssuer: InvoiceIssuer = { postal_code: "", address: "", company_name: "", phone: "", registration_number: "" };

export const normalizeIssuerRegistrationNumber = (value: string) => value.normalize("NFKC").toUpperCase().replace(/[\s\u200B\uFEFF]/g, "");

export function validateInvoiceIssuer(value: any): InvoiceIssuer {
  const issuer = Object.fromEntries(Object.keys(emptyInvoiceIssuer).map(key => [key, String(value?.[key] ?? "").trim()])) as InvoiceIssuer;
  issuer.postal_code = issuer.postal_code.normalize("NFKC").replace(/[-ー－\s]/g, "");
  if (!/^\d{7}$/.test(issuer.postal_code)) throw new Error("発行元の郵便番号は7桁で入力してください。");
  issuer.postal_code = `${issuer.postal_code.slice(0, 3)}-${issuer.postal_code.slice(3)}`;
  if (!issuer.address || issuer.address.length > 300) throw new Error("発行元の住所を300文字以内で入力してください。");
  if (!issuer.company_name || issuer.company_name.length > 200) throw new Error("発行元の会社名を200文字以内で入力してください。");
  issuer.phone = issuer.phone.normalize("NFKC");
  if (!/^[+\d()\s-]{10,30}$/.test(issuer.phone) || !/^\d{10,15}$/.test(issuer.phone.replace(/\D/g, ""))) throw new Error("発行元の電話番号を正しく入力してください。");
  issuer.registration_number = normalizeIssuerRegistrationNumber(issuer.registration_number);
  if (issuer.registration_number && !/^T\d{13}$/.test(issuer.registration_number)) throw new Error("登録番号はTと13桁の数字で入力してください。");
  return issuer;
}

export const escapeDocumentText = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!));

export function invoiceIssuerHtml(issuer?: Partial<InvoiceIssuer> | null) {
  if (!issuer?.company_name) return "<div>発行元: el-town</div>";
  return [
    `<div>発行元: ${escapeDocumentText(issuer.company_name)}</div>`,
    issuer.postal_code && `<div>〒${escapeDocumentText(issuer.postal_code)}</div>`,
    issuer.address && `<div>${escapeDocumentText(issuer.address)}</div>`,
    issuer.phone && `<div>電話番号: ${escapeDocumentText(issuer.phone)}</div>`,
    issuer.registration_number && `<div>適格請求書発行事業者登録番号: ${escapeDocumentText(issuer.registration_number)}</div>`,
  ].filter(Boolean).join("\n");
}
