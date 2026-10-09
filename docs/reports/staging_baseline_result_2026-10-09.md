# 検証用Supabase構造baseline適用結果（2026-10-09）

対象: `el-town-staging`、Project ID `zghcorbdtslrjtkkspfe`。ユーザーがSupabase SQL Editorで修正版 `20261007_schema_DENY_BY_DEFAULT.sql` を実行し、同じ画面で `postflight_readonly.sql` の結果を共有した。

| 確認項目 | 結果 | 期待値 |
| --- | ---: | ---: |
| publicテーブル | 45 | 45 |
| public関数 | 32 | 既存RLS関数1＋baseline31 |
| public Policy | 0 | 0 |
| RLS有効テーブル | 45 | 45 |
| Authユーザー | 0 | 0 |
| 有効な `ensure_rls` | 1 | 1 |
| `anon` の役員表SELECT | false | false |
| `authenticated` の役員表SELECT | false | false |
| `service_role` の役員表UPDATE | true | true |

全項目が一致したため、構造baselineの適用完了と判定する。この結果はスキーマと最小限の権限状態を示すもので、アプリ機能や実SupabaseでのAPI連携は未検証。追加GRANT/RLS、Storage Policy、検証用システム管理者ID、検証Netlifyの設定は別作業。既存の `rls_auto_enable()` と有効な `ensure_rls` は維持された。本番Supabase・本番Netlifyには操作していない。
