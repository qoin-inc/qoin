# el-town 検証環境台帳

最終更新: 2026-10-18（JST）

この台帳には公開可能な識別子と接続先のみを記録する。パスワード、API秘密キー、Webhook署名値、LINE channel access tokenは記載しない。

| サービス | 検証用リソース | 識別子・URL | 状態 |
|---|---|---|---|
| Supabase | `el-town-staging` | Project Ref: `zghcorbdtslrjtkkspfe`、Project URL: `https://zghcorbdtslrjtkkspfe.supabase.co`。リージョン: Tokyo、Compute: Micro | 2026-10-09に構造baselineと役員所属確認の限定権限SQLを適用。2026-10-18にシステム管理者ID用SQLを適用し、専用表のRLS・クライアントアクセス拒否を確認。検証用Authユーザーを許可表に1件登録し、指定UID一致を確認。一時ログインで管理者判定関数2件がtrue。ローカルの検証用接続設定はGit管理対象外。その他のアプリ用権限は未適用、アプリ全体の結合試験とNetlifyデプロイは未実施 |
| Netlify | `el-town-staging` | Site ID: `4e00785b-ffe1-4e3b-bc45-c1ab26d7a3ba`、URL: `https://el-town-staging.netlify.app` | 2026-10-06に既存の `el-town` チームで空サイトを作成。GitHub未接続、公開済みdeployなし |
| LINE | 検証用Provider・公式アカウント・LINE Login・Messaging API・LIFF | 未作成 | 本番とは別に作成予定。LIFF Endpoint URLには検証用Netlify URLを使用 |
| Stripe | 検証用Sandbox・Webhook | 未作成 | 本番決済・Connectアカウントとは分離予定 |

NetlifyサイトはCLIの `sites:create` で `--disable-linking` を指定して作成した。アプリの環境別LIFF ID、Stripe環境判定、デプロイ先の設定修正と、Supabaseの権限整備が終わるまでアプリをデプロイしない。
