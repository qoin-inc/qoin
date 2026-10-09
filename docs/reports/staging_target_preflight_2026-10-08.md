# 検証用Supabase接続先の事前確認（2026-10-08）

共有された `el-town-staging` のSupabase画面には `https://zghcorbdtslrjtkkspfe.supabase.co` が表示されていた。2026-10-09に共有されたSettings → General画面でProject ID `zghcorbdtslrjtkkspfe`、リージョン `ap-northeast-1` を再確認した。実際のDB変更・デプロイ直前にも、対象のプロジェクト名とIDを照合する。

2026-10-09に作業ブランチのGit追跡外 `.env.local` を検証ProjectのURL・Ref・publishable keyへ設定した。ローカルの接続先チェックは通過し、公開Auth設定への読み取りリクエストがHTTP 200を返した。キーの値は記録しない。これでDBの空状態、SQLの実環境互換性、アプリ全体の動作が証明されたわけではない。過去の履歴に含まれた `NETLIFY_AUTH_TOKEN` は2026-06-27から同じ値で、Netlify画面には同日作成の期限切れトークンがある。ただし画面で値を照合できず、同一トークンとは確定していない。有効なトークンは用途を確認するまで削除しない。

## 接続前の手順

1. Supabase管理画面で `el-town-staging` のProject RefとProject URLを照合する。Project名だけで判断しない。
2. `.env.staging.example` を参照し、この作業ブランチのGit追跡外 `.env.local` に `NEXT_PUBLIC_SUPABASE_URL`、検証Projectの公開用キー、`STAGING_SUPABASE_PROJECT_REF` を設定する。`NEXT_PUBLIC_SUPABASE_ANON_KEY` に入れるのは検証Projectのpublishable/anon keyであり、service_role/secret keyではない。秘密キーは文書・チャット・Gitに記録しない。
3. リポジトリのルートで `node scripts/check-staging-target.mjs <管理画面で確認したProject Ref> <検証用envファイル>` を実行する。このコマンドはローカルファイルのみを読み、ネットワークへ接続しない。正常終了してもキーの正しさやDBの状態は証明しない。
4. DB適用前に、Supabase SQL EditorでProject IDを照合し、`supabase/staging-baseline/preflight_readonly.sql` を実行して対象Projectが空であることを確認する。baseline SQLと権限SQLの適用順、管理画面全体に必要なRLSと権限も確認する。現行の役員権限SQLはローカル専用であり、実Projectにそのまま適用できない。
5. Netlify検証サイトに設定する接続先も同じProject Refと照合する。デプロイは `AGENTS.md` の承認付き手順を使う。

2026-10-08時点では手順3がProject Ref未設定とURL不一致で失敗した。2026-10-09に設定を修正し、手順3と公開Auth設定の読み取りが通過した。実SupabaseへのDB変更とNetlifyデプロイは行っていない。

2026-10-09に共有されたSQL Editorの結果は `public_tables=0`、`auth_users=0`、`app_schema_present=false` だった。ただし画像にはProject IDが写っていないため、この結果だけでは検証ProjectのDBと断定できない。baseline適用時にSQL Editor上のProject IDを再確認する。baseline本体には既存テーブルまたはAuthユーザーがある場合の停止ガードを追加し、使い捨てDBで拒否と空DBへの適用を確認した。

同日に共有されたSettings → General画面で `el-town-staging` のProject ID `zghcorbdtslrjtkkspfe` を再確認した。適用手順を見直し、既存の `public` 関数が上書き・権限変更されないよう、関数件数も事前確認とSQL本体の停止条件に追加した。最初のSQL Editor結果には関数件数がないため、更新版 `preflight_readonly.sql` の再実行が必要。`docs/admin/staging-baseline-apply.md` に実Project向けの適用順と事後確認を記録した。実Projectへのbaseline適用は未実施。

更新版のSQL Editor結果で `public_functions=1` を確認した。関数名は `rls_auto_enable`、戻り値は `event_trigger`、所有者は `postgres`、拡張機能には属さず、`ensure_rls` イベントトリガーが有効（`O`）。これはProject作成時に選択したautomatic RLS設定と整合する。baselineはこの既存関数とトリガーだけを許容し、関数の一括ACL変更から除外するよう修正した。他の既存関数は引き続き拒否する。実Projectへのbaseline適用は未実施。

## 2026-10-09 適用結果

ユーザーが `el-town-staging` のSQL Editorで修正版baselineを実行した後、`postflight_readonly.sql` の結果画像を共有した。`public_tables=45`、`public_functions=32`、`public_policies=0`、`rls_tables=45`、`auth_users=0`、`enabled_rls_triggers=1`、`anon_admin_read=false`、`authenticated_admin_read=false`、`service_admin_update=true` で、手順書の期待値とすべて一致した。構造baselineの適用は完了。検証アプリ用の追加GRANT/RLS、Storage、管理者ID、Netlify環境変数は未整備のため、アプリはまだ利用できない。Netlifyデプロイと本番Projectへの操作は行っていない。
