# 検証用役員招待の所属確認権限

対象は `el-town-staging`、Project ID `zghcorbdtslrjtkkspfe` のみ。SQL EditorでProject名とIDを再確認する。本番SupabaseやCLIの既存リンク先では実行しない。

## 適用前

`supabase/staging-baseline/postflight_readonly.sql` の結果が構造baselineの期待値（publicテーブル45、関数32、Policy 0、RLS有効テーブル45、Authユーザー0、有効な `ensure_rls` 1）と一致することを確認する。結果が変わっていれば停止する。

## 適用

同じProjectのSQL Editorで `supabase/staging-baseline/20261009_admin_invite_membership_STAGING.sql` 全体を一度だけ実行する。`BEGIN` と `COMMIT` を含めて実行する。SQL冒頭のガードはbaselineのテーブル数、Policy 0件、役員表RLS、初期権限を照合する。エラーが出た場合は再実行せず、結果を確認する。

## 適用後

`supabase/staging-baseline/postflight_admin_invite_membership_readonly.sql` を実行する。期待値は `expected_policy_count=1`、`admin_policy_count=1`、4つの `member_*_read=true`、`token_read=false`、`anon_read=false`、`client_insert=false`、`client_update=false`、`client_delete=false`、`server_update=true`。一致しなければアプリ接続を止める。

このSQLで許可するのは、ログイン済み役員が自分の `active` な所属行の4列を読むことだけ。招待トークンの参照と状態変更はサーバーの `service_role` で行う。アプリ全体のGRANT/RLS、Storage、検証用管理者ID、Netlify環境変数とデプロイは別作業。実Projectへの適用結果を確認するまで、役員招待機能の動作は確認済みとしない。
