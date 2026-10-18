# el-town 検証環境台帳

最終更新: 2026-10-18（JST）

この台帳には公開可能な識別子と接続先のみを記録する。パスワード、API秘密キー、Webhook署名値、LINE channel access tokenは記載しない。

| サービス | 検証用リソース | 識別子・URL | 状態 |
|---|---|---|---|
| Supabase | `el-town-staging` | Project Ref: `zghcorbdtslrjtkkspfe`、Project URL: `https://zghcorbdtslrjtkkspfe.supabase.co`。リージョン: Tokyo、Compute: Micro | 2026-10-09に構造baselineと役員所属確認の限定権限SQLを適用。2026-10-18にシステム管理者ID用SQLを適用し、専用表のRLS・クライアントアクセス拒否を確認。検証用Authユーザーを許可表に1件登録し、指定UID一致を確認。一時ログインと役員招待APIの架空データ結合試験に成功。標準会費公開関数の限定GRANTも適用し、APIの公開201・後片付けを確認。試験用の会費版・町内会・会費設定・適用履歴は0件に復帰。ローカルの検証用接続設定はGit管理対象外。その他のアプリ用権限は未適用、アプリ全体の結合試験とNetlifyデプロイは未実施 |
| Netlify | `el-town-staging` | Site ID: `4e00785b-ffe1-4e3b-bc45-c1ab26d7a3ba`、URL: `https://el-town-staging.netlify.app` | 2026-10-06に既存の `el-town` チームで空サイトを作成。GitHub未接続、公開済みdeployなし |
| LINE | 検証用Provider・公式アカウント・LINE Login・Messaging API・LIFF | 未作成 | 本番とは別に作成予定。LIFF Endpoint URLには検証用Netlify URLを使用 |
| Stripe | 検証用Sandbox・Webhook | 未作成 | 本番決済・Connectアカウントとは分離予定 |

NetlifyサイトはCLIの `sites:create` で `--disable-linking` を指定して作成した。2026-10-18に検証ブランチから固定LIFF IDとポータルの同IDへのフォールバックを削除。ローカルのSupabase接続先検査は合格し、StripeキーとLIFF IDは未設定。

2026-10-18にNetlify CLIで検証Site IDを明示して環境変数を照合したところ、Supabase・LINE・Stripe等の値が本番サイトと同一だった。検証サイト専用の `STAGING_SUPABASE_PROJECT_REF`、`NEXT_PUBLIC_BASE_URL`、`NEXT_PUBLIC_LIFF_ID=disabled-for-staging` は設定したが、Supabase秘密鍵とシステムログイン情報の送信は自動承認審査で停止されたため未実施。検証サイトの残りの接続値は未分離であり、デプロイは行っていない。本番Netlifyサイトの設定変更コマンドは実行していない。
