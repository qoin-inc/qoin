# システム利用料 Stripe月次請求

## 目的

- 毎月16日9:00（日本時間）に団体ごとのLINE連携数を固定する。
- 翌月1日9:00（日本時間）にStripe請求書を発行する。
- カード選択団体は初回登録済みカードへ自動請求する。
- 銀行振込選択団体は専用仮想口座付き請求書を受け取り、Stripeが着金を自動消し込みする。

会費受取用のStripe Connectアカウントとは分離し、システム利用料はel-townプラットフォームStripeアカウント上のCustomerとして管理する。

## 本番適用

1. Supabase SQL Editorで `docs/sql/system_usage_stripe_billing_2026-07-19.sql` を実行する。
2. Netlifyへ推測困難なランダム値を `SYSTEM_BILLING_CRON_SECRET` として登録する。
3. Stripe本番Webhook `https://el-town.jp/api/webhooks/stripe` へ「el-townアカウントのイベント」を送る宛先を作成し、次のイベントを有効にする。
   - `checkout.session.completed`
   - `setup_intent.succeeded`
   - `invoice.finalized`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `invoice.payment_action_required`
   - `invoice.voided`
4. 上記Webhookの署名シークレットをNetlifyの `STRIPE_WEBHOOK_SECRET` に登録する。
5. Connect接続先イベント用の宛先を同じURLで別途使用している場合は、`account.updated` と会費決済イベントを有効にし、その署名シークレットを `STRIPE_CONNECT_WEBHOOK_SECRET` に登録する。アプリは両方の署名を検証できる。
6. 本番デプロイ後、Netlify Functionsで次の2関数が `Scheduled` と表示されることを確認する。
   - `system-usage-snapshot`: `0 0 16 * *`（16日00:00 UTC = 16日09:00 JST）
   - `system-usage-invoice`: `0 0 1 * *`（1日00:00 UTC = 1日09:00 JST）

## 団体管理画面

「システム利用料」で次のいずれかを選択する。

- クレジットカード自動決済
  - 初回のみStripe Checkoutでカードを登録する。
  - Stripe Customerのデフォルト支払方法へ設定する。
  - 月次請求書は `charge_automatically` で回収する。
- Stripe銀行振込
  - 月次請求書は `send_invoice` と `customer_balance / jp_bank_transfer` で発行する。
  - 支払期限は請求月末日とする。
  - 専用仮想口座はStripe請求書PDFと決済ページに表示される。

Stripe Customerは `preferred_locales: ["ja"]` で作成し、請求書・メール・決済ページを日本語化する。

## システム管理画面

- 料金単価を全団体へ反映できる。
- 「16日実績を手動確定」で選択月の接続数と適用単価を固定できる。
- 「Stripe請求書を発行・再処理」で未発行分を処理できる。
- 本番請求書の手動発行時は、確認のため対象月の入力を要求する。
- 決済方法未選択、カード未登録、請求書発行失敗を団体別に表示する。

## 請求項目

Stripe請求書へ数量と単価を次のように連携する。

| 項目 | 数量 | 単価 |
|---|---:|---:|
| 接続数利用料 | 16日時点の連携アカウント数 | `monthly_household_price` |
| プッシュ通知超過料 | 月間超過件数 | `push_unit_price` |

手動税率のStripe Tax Rateを使用し、`tax_rate` の消費税を請求書へ表示する。

## 障害時

- 16日処理が失敗し、請求行が存在しない場合は、1日処理が接続数を補完固定し `snapshot_source=invoice_fallback` を記録する。
- 決済方法未選択は `payment_method_required`、カード未登録は `card_setup_required` として請求発行を保留する。
- Stripe APIエラーは `invoice_failed` と `stripe_last_error` に記録し、システム管理画面から再処理する。
- `stripe_invoice_id` が保存済みの行は再発行しない。
