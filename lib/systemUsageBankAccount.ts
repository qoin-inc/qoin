export type BankAccount = {
  bank_name: string;
  bank_code?: string;
  bank_branch_code?: string;
  bank_branch_name: string;
  bank_account_type: string;
  bank_account_number: string;
  bank_account_holder: string;
};

export const emptyBankAccount: BankAccount = { bank_code: "", bank_branch_code: "", bank_name: "", bank_branch_name: "", bank_account_type: "ordinary", bank_account_number: "", bank_account_holder: "" };

export function withBankCodes(account: BankAccount): BankAccount {
  const isGmo = account.bank_name.normalize("NFKC").replace(/\s/g, "").toUpperCase() === "GMOあおぞらネット銀行";
  return { ...account, bank_code: account.bank_code || (isGmo ? "0310" : ""), bank_branch_code: account.bank_branch_code || (isGmo && account.bank_branch_name.trim() === "法人第二営業部" ? "102" : "") };
}

export function validateBankAccount(value: any): BankAccount {
  const account = withBankCodes(Object.fromEntries(Object.keys(emptyBankAccount).map((key) => [key, String(value?.[key] || "").trim()])) as BankAccount);
  account.bank_code = (account.bank_code || "").normalize("NFKC");
  account.bank_branch_code = (account.bank_branch_code || "").normalize("NFKC");
  if (!/^[0-9]{4}$/.test(account.bank_code)) throw new Error("金融機関コードは4桁で入力してください。");
  if (!/^[0-9]{3}$/.test(account.bank_branch_code)) throw new Error("支店コードは3桁で入力してください。");
  account.bank_account_number = account.bank_account_number.normalize("NFKC");
  if (!account.bank_name || account.bank_name.length > 100 || !account.bank_branch_name || account.bank_branch_name.length > 100) throw new Error("銀行名・支店名を100文字以内で入力してください。");
  if (!["ordinary", "checking"].includes(account.bank_account_type)) throw new Error("口座種別を選択してください。");
  if (!/^[0-9]{7}$/.test(account.bank_account_number)) throw new Error("口座番号は先頭の0を含めて7桁で入力してください。");
  if (!account.bank_account_holder || account.bank_account_holder.length > 200) throw new Error("口座名義を200文字以内で入力してください。");
  return account;
}

export const bankAccountText = (value: BankAccount) => {
  const account = withBankCodes(value);
  return `${account.bank_name}${account.bank_code ? `（金融機関コード：${account.bank_code}）` : ""} ${account.bank_branch_name}${account.bank_branch_code ? `（支店コード：${account.bank_branch_code}）` : ""} / ${account.bank_account_type === "checking" ? "当座" : "普通"} ${account.bank_account_number} / ${account.bank_account_holder}`;
};
