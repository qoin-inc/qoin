# Stripe連携方針

## 町内会・自治会のStripe登録

- 町内会・自治会は、el-town本番環境からStripe本番モードで登録する。
- 町内会・自治会にテストモード登録や本番切替操作は求めない。
- Stripeとの契約主体は、各町内会・自治会とStripeとする。
- el-townは、Stripe Connectを使った登録導線、会費請求、Webhook入金反映、領収書出力の仕組みを標準機能として提供する。

## el-town側の検証

- el-town運営・開発環境では、Stripeテストモードを使って会費請求、Webhook、領収書反映を検証する。
- el-town本番環境では、Stripe本番キーと本番Webhookのみを使う。

## 本番環境の秘密情報

- `STRIPE_SECRET_KEY`: Stripe本番APIキー。Netlifyではsecret値としてFunctions/Runtimeへ設定する。
- `STRIPE_WEBHOOK_SECRET`: `/api/webhooks/stripe` に登録した本番Webhookエンドポイントの署名シークレット。Stripe APIキーとは別に管理する。
- `SUPABASE_SERVICE_ROLE_KEY`: Stripe署名検証後のWebhookだけがDBへ状態・入金結果を保存するためのサーバー専用キー。ブラウザへ公開せず、`NEXT_PUBLIC_` を付けない。
- 管理画面からのStripe操作はSupabase管理者セッションを検証し、対象町内会・自治会の有効な役員だけに許可する。
- Webhookは署名がない、または署名検証に失敗したリクエストを受け付けない。

## 会費請求を許可する条件

- 町内会・自治会のStripe Connectアカウントが登録済みであること。
- 本番環境では、Stripeアカウントがlive modeであること。
- `charges_enabled` が有効であること。
- 可能であれば `payouts_enabled` も確認し、審査・追加情報提出が必要な場合は管理画面で再開導線を表示する。
