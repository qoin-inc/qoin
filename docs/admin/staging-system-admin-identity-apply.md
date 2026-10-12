# 検証用システム管理者IDの適用手順

対象はSupabaseの `el-town-staging`、Project ID `zghcorbdtslrjtkkspfe` のみ。本番Projectや本番へリンクされたCLIでは実行しない。`main / PRODUCTION` の表示は、この検証Project内のDBブランチを指す。画面上部のProject名とSettingsのProject IDを先に照合する。

## 前提

- 構造baselineと役員所属確認SQLが適用済みで、`postflight_admin_invite_membership_readonly.sql` の期待値がすべて一致すること。
- 検証ProjectのAuthenticationに専用ユーザーを作り、そのAuthユーザーID（UUID）を管理画面で確認すること。本番ProjectのIDを流用しない。
- `STAGING_SYSTEM_ADMIN_AUTH_ID` は検証用のサーバー環境変数にのみ設定する。秘密キー、ログインパスワード、セッショントークンをGit・日報・チャットに記載しない。

## 構造の適用と確認

1. `supabase/staging-baseline/20261013_system_admin_identity_STAGING.sql` 全体を、上記ProjectのSQL Editorで一度だけ実行する。先頭のガードはpublicテーブル45件・Policy 1件と所属確認Policyの存在を確認し、異なる状態なら変更前に停止する。エラー時は再実行せず原因を確認する。
2. 新しいクエリで `supabase/staging-baseline/postflight_system_admin_identity_readonly.sql` を実行する。期待値は `identity_table_present=true`、`identity_rls_enabled=true`、`configured_admins=0`、匿名とログイン利用者の専用schema・表へのアクセスはfalse、匿名の関数実行はfalse、ログイン利用者の2関数実行はtrue。専用表が空の間、誰もシステム管理者にはならない。
3. AuthユーザーIDを専用表に登録する作業は、ユーザーのIDと権限設計を再確認してから別途行う。今回のSQLはユーザーを登録しない。

## アプリ接続前

`/system` のサーバー設定には検証用SupabaseのURL・Project Ref・公開キー・秘密キー、`STAGING_SYSTEM_ADMIN_AUTH_ID`、`SYSTEM_LOGIN_ID`、`SYSTEM_LOGIN_PASSWORD`、32文字以上の `SYSTEM_SESSION_SECRET` が必要。設定が欠ける場合、または接続先・AuthユーザーIDが一致しない場合はログインしない。検証用Netlifyにはまだデプロイしない。ほかの管理画面権限とStorage Policy、実Supabaseでのログイン試験も残る。

このSQLは通常の `supabase/migrations/` 外に置く。`supabase db push` の対象にしない。
