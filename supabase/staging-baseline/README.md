# 検証DBの構造baseline（アクセス拒否が初期状態）

`20261007_schema_DENY_BY_DEFAULT.sql` は、2026-10-06取得のスキーマのみの下書きから、135件の既存Policyと343件のACL文を取り除いた検証用構造案です。行データ、Authユーザー、Storage bucketは含みません。既存の12本のmigration適用後の状態なので、重ねて再実行しません。

この段階では `anon` と `authenticated` に表・シーケンス・関数のアクセスを付けません。`service_role` はサーバー用に許可します。固定メールによるシステム管理者判定は常にfalseとし、システム管理者の自動追加および名簿削除時のAuthユーザー削除は無効化しています。したがって、**このSQLを適用するだけではアプリは動作しません**。操作ごとのGRANT、RLS Policy、Storage Policy、検証用管理者IDの設計とテストが残ります。

このファイルは通常の `supabase/migrations/` の外に置いています。本番にリンクされたCLIで `supabase db push` を実行しないでください。検証Projectへの適用前にはProject Refを別手順で照合し、承認済みの適用手順を用意します。現時点ではローカルの使い捨てPostgreSQLで `check_denied.sql` を実行して確認する用途に限ります。

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
