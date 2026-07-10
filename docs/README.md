# el-town docs

このフォルダは、el-town の設計資料、日報、SQL、運用メモを用途別に整理しています。

## フォルダ構成

- `reports/`
  - 日次の作業レポート。
  - 例: `daily_report_2026-07-10.md`
- `sql/`
  - Supabase SQL Editor で実行するDB変更SQL。
  - 実行前に対象プロジェクトと日付を確認してください。
- `architecture/`
  - システム構成、機能別設計、機能チェックリスト。
- `admin/`
  - 管理画面の構成・画面設計資料。
- `integrations/`
  - Stripe、LINE、外部サービス連携に関する方針やメモ。

## よく使う資料

- 最新日報: `reports/daily_report_2026-07-10.md`
- 機能チェックリスト: `architecture/feature_checklist.md`
- 機能別システム構成: `architecture/system_architecture_by_feature.md`
- LINEプッシュ通知用SQL: `sql/line_push_user_id_columns_2026-07-10.sql`
- 発信機能用SQL: `sql/publish_feature_columns_2026-07-08.sql`
- Live・施設予約SQL: `sql/live_facility_columns_2026-07-08.sql`
- 総会会計SQL: `sql/assembly_accounting_columns_2026-07-09.sql`

## 運用メモ

- 旧日報内には、当時の配置として `docs/*.sql` や `docs/*.md` の表記が残っています。
- 現在のSQLファイルは `docs/sql/` 配下です。
- 本番環境に影響する環境変数やLINEアクセストークンは、ドキュメントやチャットに貼らず、NetlifyまたはLINE Developers上で管理してください。
