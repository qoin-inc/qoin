# 検証DBの構造baseline（アクセス拒否が初期状態）

`20261007_schema_DENY_BY_DEFAULT.sql` は、2026-10-06取得のスキーマのみの下書きから、135件の既存Policyと343件のACL文を取り除いた検証用構造案です。行データ、Authユーザー、Storage bucketは含みません。既存の12本のmigration適用後の状態なので、重ねて再実行しません。

この段階では `anon` と `authenticated` に表・シーケンス・関数のアクセスを付けません。`service_role` はサーバー用に許可します。固定メールによるシステム管理者判定は常にfalseとし、システム管理者の自動追加および名簿削除時のAuthユーザー削除は無効化しています。したがって、**このSQLを適用するだけではアプリは動作しません**。操作ごとのGRANT、RLS Policy、Storage Policy、検証用管理者IDの設計とテストが残ります。

役員招待の所属確認に限った追加権限案は `20261008_admin_invite_membership_LOCAL_ONLY.sql` に分離しました。ローカル実行ガード付きで、実Supabase Projectには適用できません。対象操作、テスト結果、未対応のブラウザ直接操作は `docs/reports/staging_admin_invite_access_2026-10-08.md` に記録しています。

このファイルは通常の `supabase/migrations/` の外に置いています。本番にリンクされたCLIで `supabase db push` を実行しないでください。検証Projectへの適用前にはProject Refを別手順で照合し、承認済みの適用手順を用意します。現時点ではローカルの使い捨てPostgreSQLで `check_denied.sql` を実行して確認する用途に限ります。

検証Projectの空状態を確認する読み取りSQLは `preflight_readonly.sql` に分離しました。SupabaseのSQL Editorを開いた際に、画面のProject IDが `zghcorbdtslrjtkkspfe` であることを先に確認してください。このSQL自体はProject IDを証明できません。`public_tables` と `auth_users` がともに0、`app_schema_present` がfalseであることを確認するまでbaselineを適用しません。SQLの結果が条件を満たしても、アプリ全体の権限設計と実Supabaseでの互換性確認が残ります。

2026-10-07にPGlite 0.5.8（PostgreSQL 18.3相当）のメモリ内DBへ適用し、`check_denied.sql` が通過しました。45テーブル、31関数、Policy 0件、`anon` の役員表SELECT拒否、`service_role` の役員表UPDATE許可を確認しました。新規表・シーケンス・関数の既定権限も拒否側を検証しました。PGliteにはSupabase Authの最小スタブを用いており、Supabase実環境の互換性やアプリ機能はまだ確認していません。Docker Desktopは一時ソケットの起動エラーが再発し、PostgreSQL 17コンテナでの確認は実施できませんでした。

リポジトリのルートから再実行できます。PGliteはリポジトリ外の一時ディレクトリへ入れ、実際のSupabaseには接続しません。

```powershell
npm install --prefix "$env:TEMP\el-town-pglite-test" --no-save --ignore-scripts @electric-sql/pglite
node scripts/test-staging-baseline-pglite.mjs "$env:TEMP\el-town-pglite-test\node_modules\@electric-sql\pglite\dist\index.js"
```

再生成には、ローカルに保管したガード付き下書きを入力にします。

```powershell
node scripts/build-staging-baseline.mjs <review-draft.sql> supabase/staging-baseline/20261007_schema_DENY_BY_DEFAULT.sql
```
