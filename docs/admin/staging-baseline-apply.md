# 検証用Supabaseの構造baseline適用手順

対象は `el-town-staging`、Project ID `zghcorbdtslrjtkkspfe` の空DBのみ。本番ProjectやCLIの既存リンク先では実行しない。SQL Editorの上部でProject名を確認し、Settings → GeneralでProject IDを再照合する。`main / PRODUCTION` はこの検証Project内のブランチ表示であり、Project IDの代わりに判断しない。

## 適用前

1. `supabase/staging-baseline/preflight_readonly.sql` を**同じProjectのSQL Editor**で実行する。`public_tables=0`、`public_functions=0`、`auth_users=0`、`app_schema_present=false` 以外なら停止する。2026-10-09の初回確認画像には `public_functions` が含まれないため、更新したSQLで再確認する。
2. `supabase/staging-baseline/20261007_schema_DENY_BY_DEFAULT.sql` の全内容を確認する。このファイルは構造のみで、Authユーザー・行データ・Storage bucketを移さない。冒頭の空DBガードは既存テーブル・関数またはAuthユーザーがあれば、変更前に失敗させる。
3. アプリはこの段階では動かない。クライアントの表・関数アクセスは拒否状態で、役員招待の追加権限SQLもまだローカル専用であることを確認する。

## 適用

Project名とIDを再確認したSQL Editorで、baseline SQL全体を**一度だけ**実行する。`BEGIN` から `COMMIT` までを省略・分割しない。エラーが出た場合は再実行せず、エラー内容とSQL Editorの対象Projectを確認する。既存12本のmigrationを重ねて適用しない。

## 適用後

同じProjectのSQL Editorで `supabase/staging-baseline/postflight_readonly.sql` を実行する。期待値は `public_tables=45`、`public_functions=31`、`public_policies=0`、`rls_tables=45`、`auth_users=0`、`anon_admin_read=false`、`authenticated_admin_read=false`、`service_admin_update=true`。一致しなければアプリ接続や追加SQLを止める。

この手順ではNetlify、LINE、Stripe、本番Supabaseには触れない。検証アプリの稼働には別途RLS/GRANT、Storage、検証用管理者ID、環境変数の整備が必要。
