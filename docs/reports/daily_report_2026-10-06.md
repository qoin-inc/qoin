# 日報 2026-10-06

対象：el-town。日本時間。管理画面で確認した情報と、ローカルで実施した調査・検証を記録する。

## 本日の実績

### 検証用リソースの確認

- Netlifyに検証用サイト `el-town-staging` を用意した。Site IDは `4e00785b-ffe1-4e3b-bc45-c1ab26d7a3ba`、URLは `https://el-town-staging.netlify.app`。アプリのデプロイとGit連携は未実施。
- LINE Developersで既存のProviderとチャネルを確認した。検証候補のLINE LoginチャネルはID `2009700969`、LIFF `el-town` はID `2009700969-9dn0R2dB` で、Endpointは現在 `https://example.com`。別のLIFF `el-town-kairanban` は旧Netlifyサイトを指しているため変更していない。
- 検証候補のMessaging APIアカウントのベーシックIDは `@116cskbo`。本番公式アカウント `@107rhwia` とは別であることを画面上で確認した。Webhook URLは未設定。LINEの検証用設定変更はまだ行っていない。

### Supabase baseline migrationの調査と下書き

- 既存のmigration 12本は差分のみで、空の検証用Supabase Projectにはそのまま適用できないことを確認した。詳しい調査結果は `docs/reports/baseline_migration_audit_2026-10-06.md` に記録した。
- 本番DBの定義情報をデータ抜きで取得した。`public` にはテーブル45件、関数31件、ユーザー定義トリガー15件があり、45テーブルすべてでRLSが有効。行データは取得していない。
- 本番ドメインの管理者メールを架空のアドレスに置き換えたbaseline SQL下書きを `supabase/staging-baseline/20261006_public_schema_DRAFT.sql` に作成した。通常のmigrationフォルダには入れていない。
- 使い捨てのローカルPostgreSQLに下書きを適用し、45テーブル、31関数、`public` のPolicy 135件、15トリガーを確認した。既存migration 12本も続けてSQLエラーなく実行できた。検証用Supabase Projectへの適用、アプリの動作確認は未実施。
- Docker Desktopの起動エラーは、ローカルの一時 `run` フォルダを退避して復旧した。factory resetは行っていない。検証後、Docker Desktopは停止した。

### 本番への影響と確認事項

- 本番へのデプロイ、migration適用、アプリ設定変更、テーブルや行データの変更は実施していない。
- スキーマ取得時にSupabase CLIが本番DBの一時接続用 `cli_login_postgres` ロールを初期化した。確認したパスワードの有効期限は2026-10-06 08:56:55 JSTで、最終確認時には失効していた。このため、本番DBが完全に無変更だったとは記録しない。
- 本番に既存の広いアクセス許可があることを定義上で確認した。例として `fee_records` には `TO public` かつ `true` 条件の読み書きPolicyと、`anon` の対応する権限がある。匿名APIからの実アクセスは検証しておらず、影響範囲は未確認。今回作成した設定ではない。
- 本番アプリへの異常を示す事実は確認していない。ただし、実利用テストは行っていないため、影響がないことを保証する確認までは完了していない。

## 明日やること（2026-10-07）

1. baseline下書きのRLS Policy、GRANT、`SECURITY DEFINER` 関数を確認し、検証環境へそのまま持ち込むべきでない許可を整理する。Storage bucket・Policyと検証用管理者の扱いも決める。
2. Supabase検証用ProjectのProject Ref、請求見込み、秘密情報の保管先を確認する。DBへの適用は、対象が検証Projectであることを明示して照合できる手順を整えてから行う。
3. NetlifyとLINEの検証用設定を整理する。現行アプリの本番LIFF ID固定値、Stripeの本番・検証キー判定、デプロイ先の分離を確認し、検証サイトへの公開前に修正計画を固める。
4. LINEの検証候補チャネルと本番チャネルの対応を再確認し、検証用LIFF EndpointとWebhook URLの設定先を決める。本番側の設定は変更しない。

本日報の作成に伴う検証用DBへの適用、Netlifyへのデプロイ、本番環境の設定変更は行っていない。調査報告とbaseline SQL下書きはローカルに保存している。
