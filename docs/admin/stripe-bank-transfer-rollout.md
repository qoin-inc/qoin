# Stripe銀行振込への切替（2026-09-12）

会費は町内会・自治会のStripe Connectアカウント、システム利用料はel-town運営のStripeアカウントで受け付けます。銀行振込は顧客残高（customer_balance）を利用します。

## 振込先と帳票

- 会費：接続先Stripeアカウントと会員世帯の組合せごとにCustomerを作成し、日本の銀行振込先を取得します。
- システム利用料：請求先の町内会・自治会ごとに、運営Stripeアカウント内のCustomerと振込先を用意します。
- システム管理の振込先は表示のみです。Stripeから取得した銀行・支店・口座種別・口座番号・口座名義を請求先別に表示します。Stripeから運営の銀行への振り込み先とは異なります。
- 請求書には発行時の振込先を保存して表示します。領収書には支払方法・支払日・金額を表示し、振込先を表示しません。
- 発行済みの旧直接振込の請求書とその手動入金確認は残します。過去の請求先口座を新しいStripe口座へ差し替えません。

## 本番反映前の手順

1. Supabase SQL Editorで `supabase/migrations/202609120001_stripe_bank_transfers.sql` を適用します。追加列・サービス専用テーブル・入金記録関数を一つのトランザクションで作成します。旧アプリ稼働中にも対応できるよう、旧銀行振込フラグは保持します。新しい設定画面で保存すると旧フラグを無効にします。
2. Stripe運営アカウントの決済手段でJPY銀行振込を有効にします。現在のアカウント制限・審査の解除はStripeで確認してください。
3. Stripe Webhookで、接続アカウント用エンドポイント `https://el-town.jp/api/webhooks/stripe` に `checkout.session.completed` と **`checkout.session.async_payment_succeeded`** が配信されることを確認します。運営アカウント側では既存の `invoice.finalized`、`invoice.paid`、`invoice.payment_failed`、`invoice.payment_action_required`、`invoice.voided` を配信します。既存のカード設定・account.updatedのイベントも維持してください。エンドポイントの署名シークレットは従来のNetlify設定を使います。
4. テスト環境のStripeで、専用口座の発行・不足入金・満額入金・カード決済を確認します。自動テストは模擬StripeとローカルPostgreSQLで実行しており、実際のStripeアカウントでの決済は実施していません。
5. コミットをGitHubへ反映し、本番用ビルド後に `docs/admin/safe-deployment.md` の承認付きデプロイを実行します。DB未適用のまま公開しないでください。
6. 町内会・自治会の「会費管理」で支払方法を選び、保存します。Stripe銀行振込を選ぶと `jp_bank_transfer_payments` capabilityを申請します。審査中は銀行振込を決済画面に表示せず、有効なカード等を継続して利用できます。
7. システム利用料で「Stripe銀行振込」を選び、請求先専用の振込先を確認します。新しい請求はStripe Invoiceで作成し、入金確定通知で自動反映します。定期請求の運用フラグは自動で変更しません。

## 入金確認

Checkoutを完了しても `payment_status` が `paid` になるまで会費を入金済みにしません。入金記録はPaymentIntentごとに一度だけ集計し、現金入金を保持します。会計年度確定後の未記録入金は既存の締め後入金確認へ回します。既に記録済みの通知の再送は締め後入金を新規作成しません。

不足分はStripeの振込案内ページで確認できます。過払い分はStripe顧客残高になります。入金確認中に現金入金や請求額変更で残額が変わった場合は、追加送金前に役員へ確認する表示にします。

## 検証コマンド

```powershell
npx.cmd tsc --noEmit --incremental false
node scripts/test-system-usage-bank.cjs
node scripts/test-stripe-bank-checkout.cjs
node scripts/test-stripe-bank-webhook.cjs
node scripts/test-stripe-status-display.cjs
```

SQLのローカルテストは、テスト用ディレクトリへ `@electric-sql/pglite` をインストールし、`PGLITE_MODULE` にそのモジュールの絶対パスを指定して `node scripts/test-stripe-bank-sql.cjs` を実行します。本番データは利用しません。

Stripeの仕様：[銀行振込の受け付け](https://docs.stripe.com/payments/bank-transfers/accept-a-payment)、[請求書と銀行振込](https://docs.stripe.com/invoicing/bank-transfer)、[日本の銀行振込capability](https://docs.stripe.com/changelog/2024-06-20/deprecates-bank-transfer-payments-capabilities)。
