# 検証用Supabase接続先の事前確認（2026-10-08）

共有された `el-town-staging` のSupabase画面には `https://zghcorbdtslrjtkkspfe.supabase.co` が表示されていた。2026-10-09に共有されたSettings → General画面でProject ID `zghcorbdtslrjtkkspfe`、リージョン `ap-northeast-1` を再確認した。実際のDB変更・デプロイ直前にも、対象のプロジェクト名とIDを照合する。

この作業ブランチに残るローカル `.env.local` は別のSupabaseホストを指し、`STAGING_SUPABASE_PROJECT_REF` も未設定。現状の設定を使ってアプリ、DBコマンド、結合テストを起動しない。`.env.local` はGitの追跡から外した。過去の履歴に含まれた `NETLIFY_AUTH_TOKEN` は2026-06-27から同じ値で、Netlify画面には同日作成の期限切れトークンがある。ただし画面で値を照合できず、同一トークンとは確定していない。有効なトークンは用途を確認するまで削除しない。

## 接続前の手順

1. Supabase管理画面で `el-town-staging` のProject RefとProject URLを照合する。Project名だけで判断しない。
2. `.env.staging.example` を参照し、この作業ブランチのGit追跡外 `.env.local` に `NEXT_PUBLIC_SUPABASE_URL`、検証Projectの公開用キー、`STAGING_SUPABASE_PROJECT_REF` を設定する。`NEXT_PUBLIC_SUPABASE_ANON_KEY` に入れるのは検証Projectのpublishable/anon keyであり、service_role/secret keyではない。秘密キーは文書・チャット・Gitに記録しない。
3. リポジトリのルートで `node scripts/check-staging-target.mjs <管理画面で確認したProject Ref> <検証用envファイル>` を実行する。このコマンドはローカルファイルのみを読み、ネットワークへ接続しない。正常終了してもキーの正しさやDBの状態は証明しない。
4. DB適用前に対象Projectが空であること、baseline SQLと権限SQLの適用順、管理画面全体に必要なRLSと権限を確認する。現行の役員権限SQLはローカル専用であり、実Projectにそのまま適用できない。
5. Netlify検証サイトに設定する接続先も同じProject Refと照合する。デプロイは `AGENTS.md` の承認付き手順を使う。

2026-10-08時点で手順3を既存の `.env.local` に対して実行すると、Project Ref未設定とURL不一致で失敗した。架空の検証用envでは成功した。実Supabaseへの接続、DB変更、Netlifyデプロイは行っていない。
