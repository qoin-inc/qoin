# el-town 検証環境台帳

最終更新: 2026-10-09（JST）

この台帳には公開可能な識別子と接続先のみを記録する。パスワード、API秘密キー、Webhook署名値、LINE channel access tokenは記載しない。

| サービス | 検証用リソース | 識別子・URL | 状態 |
|---|---|---|---|
| Supabase | `el-town-staging` | Project Ref: `zghcorbdtslrjtkkspfe`、Project URL: `https://zghcorbdtslrjtkkspfe.supabase.co`。リージョン: Tokyo、Compute: Micro | 2026-10-09のSettings → General画面でProject IDとリージョンを確認。URLは作成直後の画面でも確認。migration未適用、アプリ未接続 |
| Netlify | `el-town-staging` | Site ID: `4e00785b-ffe1-4e3b-bc45-c1ab26d7a3ba`、URL: `https://el-town-staging.netlify.app` | 2026-10-06に既存の `el-town` チームで空サイトを作成。GitHub未接続、公開済みdeployなし |
| LINE | 検証用Provider・公式アカウント・LINE Login・Messaging API・LIFF | 未作成 | 本番とは別に作成予定。LIFF Endpoint URLには検証用Netlify URLを使用 |
| Stripe | 検証用Sandbox・Webhook | 未作成 | 本番決済・Connectアカウントとは分離予定 |

NetlifyサイトはCLIの `sites:create` で `--disable-linking` を指定して作成した。アプリの環境別LIFF ID、Stripe環境判定、デプロイ先の設定修正と、Supabaseのbaseline migration・権限整備が終わるまでアプリをデプロイしない。
