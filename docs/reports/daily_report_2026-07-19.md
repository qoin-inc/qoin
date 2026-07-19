# 日報 2026-07-19

## システム利用料のStripe月次請求

- Stripe本番アカウントで銀行振込を有効化した。
- 団体別に「カード自動決済」「Stripe銀行振込」を選択する画面を追加した。
- カードは初回登録だけで、Stripe Customerのデフォルトカードとして保存する実装を追加した。
- 毎月16日9時にLINE連携数と適用単価を固定するNetlify Scheduled Functionを追加した。
- 翌月1日9時に数量・単価・消費税を含むStripe請求書を発行するScheduled Functionを追加した。
- 銀行振込は団体専用仮想口座を請求書へ表示し、`invoice.paid` で自動消し込みする。
- カード決済成功・失敗・追加認証、銀行振込入金、請求書確定をWebhookでDBへ反映する。
- el-town本体イベントとConnect接続先イベントでWebhook署名が分かれる構成に対応した。
- システム管理画面へ16日実績の手動確定、本番Stripe請求書発行・再処理、団体別決済状態を追加した。
- 既存の都度払いAPIへ団体管理者認証と団体ID照合を追加した。

## 追加ファイル

- `lib/systemAdminServer.ts`
- `lib/systemUsageBillingServer.ts`
- `app/api/system-usage/payment-profile/route.ts`
- `app/api/system-usage/create-setup-session/route.ts`
- `app/api/system-usage/billing-run/route.ts`
- `netlify/functions/system-usage-snapshot.mts`
- `netlify/functions/system-usage-invoice.mts`
- `docs/sql/system_usage_stripe_billing_2026-07-19.sql`
- `docs/integrations/system_usage_stripe_billing_2026-07-19.md`

## 確認結果

- TypeScript: `tsc --noEmit --incremental false` 成功
- Next.js本番ビルド: `npm.cmd run build` 成功

## 本番反映前の作業

1. Supabaseへ追加SQLを適用する。
2. Netlifyへ `SYSTEM_BILLING_CRON_SECRET` を登録する。
3. Stripe Webhookのイベントと `STRIPE_WEBHOOK_SECRET`、必要に応じて `STRIPE_CONNECT_WEBHOOK_SECRET` を確認する。
4. 本番デプロイ後、Scheduled Functionsの次回実行日時を確認する。
