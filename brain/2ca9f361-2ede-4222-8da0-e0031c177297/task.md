# Stripeテスト/本番モード分離 - タスク

- [x] DBマイグレーション: `stripe_mode`カラム追加 → Day19_stripe_mode.sql作成
- [/] ビルド確認中
- [x] Netlify Functions改修
  - [x] create-stripe-account.ts: モード対応（テスト/本番キー使い分け）
  - [x] create-checkout-session.ts: stripeModeパラメータ対応
  - [x] stripe-webhook.ts: 両モード署名検証対応
- [x] AdminView.tsx改修
  - [x] visibilitychangeでstripe_mode再取得
  - [x] モードバッジ表示（テスト/本番）
  - [x] テスト環境：テスト決済カード番号案内表示
  - [x] テスト→本番切替ボタン（handleSwitchToLive）
  - [x] テスト環境のみリセットボタン表示
  - [x] handleDisconnectStripeの文言調整
- [x] ResidentView.tsx改修: stripeMode取得・送信対応
- [ ] デプロイ
- [ ] Netlify環境変数設定（STRIPE_SECRET_KEY_TEST/LIVE等）
- [ ] Supabase DBマイグレーション実行
- [ ] 既存データの初期値設定（夢ケ丘２区→live）
