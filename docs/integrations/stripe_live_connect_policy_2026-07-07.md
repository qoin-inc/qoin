# Stripe連携方針

## 町内会・自治会のStripe登録

- 町内会・自治会は、el-town本番環境からStripe本番モードで登録する。
- 町内会・自治会にテストモード登録や本番切替操作は求めない。
- Stripeとの契約主体は、各町内会・自治会とStripeとする。
- el-townは、Stripe Connectを使った登録導線、会費請求、Webhook入金反映、領収書出力の仕組みを標準機能として提供する。

## el-town側の検証

- el-town運営・開発環境では、Stripeテストモードを使って会費請求、Webhook、領収書反映を検証する。
- el-town本番環境では、Stripe本番キーと本番Webhookのみを使う。

## 会費請求を許可する条件

- 町内会・自治会のStripe Connectアカウントが登録済みであること。
- 本番環境では、Stripeアカウントがlive modeであること。
- `charges_enabled` が有効であること。
- 可能であれば `payouts_enabled` も確認し、審査・追加情報提出が必要な場合は管理画面で再開導線を表示する。
