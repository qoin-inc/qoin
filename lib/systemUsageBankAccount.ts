export type BankAccount = {
  bank_name: string;
  bank_branch_name: string;
  bank_account_type: string;
  bank_account_number: string;
  bank_account_holder: string;
};

export const emptyBankAccount: BankAccount = { bank_name: "", bank_branch_name: "", bank_account_type: "ordinary", bank_account_number: "", bank_account_holder: "" };

export function validateBankAccount(value: any): BankAccount {
  const account = Object.fromEntries(Object.keys(emptyBankAccount).map((key) => [key, String(value?.[key] || "").trim()])) as BankAccount;
  account.bank_account_number = account.bank_account_number.normalize("NFKC");
  if (!account.bank_name || account.bank_name.length > 100 || !account.bank_branch_name || account.bank_branch_name.length > 100) throw new Error("銀行名・支店名を100文字以内で入力してください。");
  if (!["ordinary", "checking"].includes(account.bank_account_type)) throw new Error("口座種別を選択してください。");
  if (!/^[0-9]{7}$/.test(account.bank_account_number)) throw new Error("口座番号は先頭の0を含めて7桁で入力してください。");
  if (!account.bank_account_holder || account.bank_account_holder.length > 200) throw new Error("口座名義を200文字以内で入力してください。");
  return account;
}

export const bankAccountText = (account: BankAccount) => `${account.bank_name} ${account.bank_branch_name} / ${account.bank_account_type === "checking" ? "当座" : "普通"} ${account.bank_account_number} / ${account.bank_account_holder}`;
