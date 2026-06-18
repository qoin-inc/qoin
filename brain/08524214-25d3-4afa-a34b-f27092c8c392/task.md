# LINE LIFF バックエンド認証リプレイス タスクリスト

- [x] Supabase DashboardでのLINEプロバイダ有効化（※お客様作業）
- [x] LINE DevelopersでのコールバックURL設定（※お客様作業）
- [x] `resident/page.tsx` からメール・パスワードのログインフォームを取り除く
- [x] 代わりに `supabase.auth.signInWithOAuth({ provider: 'line' })` となるLINEログインボタンを設置する
- [x] ログイン後のセッション情報を用いて `SignupResident` (紐付け) へ流れる状態の確認
- [x] 結合テスト
