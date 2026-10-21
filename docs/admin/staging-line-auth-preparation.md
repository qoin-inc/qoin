# 検証用LINE認証の接続準備

現時点で検証用LIFF `2009700969-9dn0R2dB` のEndpoint URLは `https://example.com`。検証用Netlifyサイトの環境変数にはこのLIFF IDを設定済みだが、サイトの再公開とLINE側のEndpoint変更は未実施。Messaging API送信値は `disabled-for-staging` のまま。

## 実装済みの認証経路

- LIFFから取得した生のID tokenを同一オリジンの `/api/line/session` に送る。プロフィールのuser IDやデコード済みtokenは本人確認に使わない。
- サーバーがLINEのID token検証APIへ検証候補チャネルID `2009700969` とともに送り、応答の発行元・対象チャネル・有効期限・user IDを確認する。接続先は検証用Netlifyと検証用Supabaseに固定し、設定が一致しなければ停止する。
- Supabase Authユーザーはサーバーだけが作成し、ランダムなパスワードと変更不能な `app_metadata` に検証済みのLINEチャネル・user IDを記録する。サーバーがmagic linkのtoken hashを内部で検証してセッションを発行する。クライアントからの固定パスワードによるログイン・登録経路は削除した。
- 旧方式の疑似メールアカウントには新しいセッションを発行しない。旧アカウントの既存セッション・予測可能なパスワードはこのコードだけでは無効化できないため、接続前に個別移行が必要。

## 接続前に確認すること

1. LINE Developersで、このLIFFと通知用の公式アカウントが本番利用者を巻き込まない検証専用のチャネル・Providerであることを確認する。共有チャネルであれば別の検証用チャネルを作り、コードの許可IDも見直す。
2. `node scripts/check-staging-line-auth.mjs` で検証用Supabase Authの旧方式LINE利用者が0件と確認する。旧利用者がいる場合はユーザーID・名簿との紐付けを保持したままパスワードと既存セッションを移行し、再確認する。
3. 検証サイトの `NEXT_PUBLIC_LIFF_ID` を `2009700969-9dn0R2dB` に設定し、検証用LIFFのEndpoint URLを `https://el-town-staging.netlify.app/` へ変更する。LINE通知の実接続は別段階とし、`LINE_CHANNEL_ACCESS_TOKEN` と `LINE_CHANNEL_SECRET` は引き続き `disabled-for-staging` に固定する。
4. 検証サイトのビルド・デプロイ計画を作り、`docs/admin/safe-deployment.md` に従って計画固有の承認を得てから公開する。
5. 架空の検証用アカウントでLIFFログイン、町内会との連携、通知を順に確認する。本番利用者への通知は行わない。

2026-10-22の読み取り確認では、検証用Authユーザー2件、旧方式LINE利用者0件だった。TypeScript検査、Next.jsビルド、Netlifyビルドは通過した。LINEの生ID tokenを使った実ログインは、検証用LIFFをまだ接続していないため未実施。

同日のLINE Developers画面では、Qoin Providerの `el-town` チャネル基本設定にある「リンクされたLINE公式アカウント」は「－」だった。この表示だけでLINEログイン自体の可否は判断できない。検証候補 `@116cskbo` と本番アカウント `@107rhwia` を取り違えない。公式アカウントのリンクは行っていない。

続く同チャネルの「Messaging API設定」画面では、ボットのベーシックIDが `@116cskbo` と確認できた。既存の2026-10-06の記録上、本番公式アカウント `@107rhwia` とは別である。ただし、この画面だけでは `@116cskbo` に実利用者がいないことや通知が本番へ届かないことまでは証明できない。接続前にLINE Official Account Managerでアカウント名・友だち数・送信履歴を確認する。

LINE Official Account Managerの `el-town`（`@116cskbo`）では、友だち数0、直近7日間の送信数0と確認した。「メッセージ配信」画面は初期案内で、配信済み一覧は表示されていなかった。これは過去すべての履歴を証明するものではないが、現時点の通知対象者が0人であることを示す。LIFFログインの接続準備を進め、Messaging API送信は引き続き無効とする。

検証用Netlify Site ID `4e00785b-ffe1-4e3b-bc45-c1ab26d7a3ba` の環境変数が本番由来のURL・LIFF ID・LINE送信値へ変わっていることを公開前照合で発見した。Site IDとサイト名 `el-town-staging` を確認し、検証用Supabase・LIFF・システム管理値へ戻し、LINE・Stripe等は無効化した。Netlify CLIの一覧では一部の秘密値がマスクされるため、公開前スクリプトはSite IDを固定したAPIの実値を出力せず比較する。公開済みデプロイにはまだ反映していない。

参照: [LINE ID token検証API](https://developers.line.biz/en/reference/line-login/)、[LINEのサーバー認証手順](https://developers.line.biz/en/tips/2026/08/13/send-token-to-server/)。
