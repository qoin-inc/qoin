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

## 本番運用開始前の確認

1. Supabaseへ追加SQLが適用済みで、テーブル・列・RLS・indexが正しいことを再確認する。
2. Netlifyへ `SYSTEM_BILLING_CRON_SECRET` を登録する。
3. Stripe Webhookのイベントと `STRIPE_WEBHOOK_SECRET`、必要に応じて `STRIPE_CONNECT_WEBHOOK_SECRET` を確認する。
4. Scheduled Functionsの次回実行日時を確認する。

## Stripe請求ランブック

- システム使用料と団体会費について、el-town側・Stripe側・団体側の設定、本番開始手順、停止方法、未実装の銀行振込・PayPay、会計処理、問い合わせ時の回答基準を `docs/reports/stripe_billing_production_runbook_2026-07-19.md` に集約した。
- 今後Stripe関連の実装・設定・審査状況を変更した場合は、同ランブックも更新する。

## システム構成・災害復旧手順書

- 2026-07-19時点の開発環境、Git/GitHub、Supabase、Netlify、言語・フレームワーク、認証、フォルダー、画面・API、UIデザイン、外部連携、環境変数、バックアップ、復旧手順、復旧後検証を `docs/reports/system_architecture_recovery_2026-07-19.md` に記録した。
- 今後は構成変更のたびに `system_architecture_recovery_YYYY-MM-DD.md` を新規作成し、過去版を上書きしない。
- 現在の重大な復旧リスクとして、`.env.local` のGit追跡、完全なDB baseline/backup不足、Storage実体backup不足、GitHub Actionsの現行構成との不一致、認証の既定値・予測可能な会員認証方式を記録した。
- 同じ内容を目次、固定サイドナビゲーション、表・コード表示、印刷レイアウト、スマホ表示に対応した `docs/reports/system_architecture_recovery_2026-07-19.html` として追加した。

## 本日の実績まとめ

### 実装・本番反映

- システム使用料について、毎月16日の接続数・単価固定と翌月1日のStripe請求書発行を実装した。
- 団体がカード自動決済またはStripe銀行振込を選択できるようにした。
- カード初回登録、銀行振込の仮想口座表示、Stripe入金の自動消し込み、Webhookによる状態反映を実装した。
- システム管理画面へ16日実績の確認・手動確定、請求書発行・再処理、団体別状態表示を追加した。
- 本番運用開始前の停止スイッチ `SYSTEM_BILLING_ENABLED` を追加し、未設定または `false` では定期処理と手動処理を停止するようにした。
- システム使用料機能はコミット `9ed56b5`、停止スイッチはコミット `fcea181` として本番デプロイ済みである。
- 団体会費のStripe手数料を、標準支出科目「支払手数料」へ自動計上する処理を本番反映した。
- スマートフォンの施設予約画面で二重表示されていた入力見出しを修正し、本番反映した。

### Stripe・会費方針

- el-townシステム使用料はel-townのStripe Platformアカウント、団体会費は各団体のStripe Connect Expressアカウントで扱う方針を確定した。
- 団体会費は各団体が請求主体・受取人となり、el-townは登録、決済、Webhook、領収書、会計連携を標準提供する方針とした。
- カード、Apple Pay、Google Payはカード決済系として扱う。会費の銀行振込とPayPayは利用条件を整理したが、団体会費にはまだ実装していない。
- PayPayはConnectでの申請と団体ごとの審査・Capability有効化が必要で、自動継続決済には使用しない整理とした。
- 会計期内に退会した会員も当期の会費実績に含め、会費総額を収入、Stripe手数料を「支払手数料」の支出として分離する方針を記録した。

### ドキュメント・ソース管理

- Stripe請求設定と本番稼働手順を `stripe_billing_production_runbook_2026-07-19.md` に集約した。
- システム構成と災害復旧手順を `system_architecture_recovery_2026-07-19.md` に集約した。
- 上記Markdown資料はコミット `45d832c` でGitHubの `deploy-ui-restore` ブランチへpush済みである。
- システム構成・災害復旧手順書の見やすいHTML版を作成した。
- 今後の構成書は日付付きファイルとして新規保存し、過去のスナップショットを上書きしない方針とした。

## 本日終了時点

- システム使用料の自動実績確定・請求は、本番運用開始前のため停止状態を維持する。
- Stripe設定は本日確認・設定した範囲で一旦中断し、実際の請求・自動決済は開始していない。
- 本日最後に作成したHTML版と、この日報の締め追記はローカル変更であり、まだコミット・pushしていない。
- HTML作成後の本番デプロイは実施していない。HTMLは運用資料であり、el-town公開画面には追加していない。
- アプリコードの作業ツリーには新たな未コミット変更はない。

## 今後の作業

### 最優先: バックアップとセキュリティ

1. `.env.local` に含まれていた秘密値をローテーションし、Git追跡から外す。必要な場合のGit履歴修正は、関係者と手順を確認してから実施する。
2. Supabase本番DBの `roles.sql`、`schema.sql`、`data.sql` を取得し、暗号化したSupabase外の保管場所へ保存する。
3. Supabase Storage `attachments` の実ファイルを別途バックアップする。DBバックアップだけでは添付ファイルを復元できない。
4. 空のSupabase Projectから復元できるbaseline migrationを整備し、テスト環境で復元試験を行う。
5. LINE user IDから予測可能なSupabaseパスワードを生成する現在方式を廃止し、LIFF ID tokenをサーバーで検証する認証方式へ変更する。
6. `/system` の本番認証環境変数を必須化し、未設定時の既定ログイン情報へのフォールバックを廃止する。

### システム使用料の本番開始準備

1. 本番Supabaseでシステム使用料テーブル、列、RLS、indexが適用済みであることを再確認する。
2. Netlifyの `SYSTEM_BILLING_CRON_SECRET`、`STRIPE_WEBHOOK_SECRET`、必要に応じて `STRIPE_CONNECT_WEBHOOK_SECRET` を確認する。
3. Netlifyで `system-usage-snapshot` と `system-usage-invoice` がScheduled Functionとして認識され、次回実行日時が正しいことを確認する。
4. テスト対象団体1件でカード登録、または銀行振込選択を行い、数量・単価・消費税・日本語請求書を確認する。
5. Webhookでカード成功・失敗、追加認証、銀行振込着金がel-townへ正しく反映されることを確認する。
6. 実運用開始日を決定した後に限り `SYSTEM_BILLING_ENABLED=true` へ変更する。

### 団体会費・Stripe Connect

1. カード、Apple Pay、Google PayをiPhone/SafariとAndroid/Chromeの実機で確認する。
2. 団体会費のStripe銀行振込について、ConnectアカウントごとのCustomer・Invoice・仮想口座・自動消し込みを実装する。
3. PayPayを導入する場合は、el-townがConnect PlatformとしてStripeへ申請し、団体別審査に必要な会費案内・決済導線・特定商取引法表記の標準ひな型を作成する。
4. 二重払い、過不足入金、返金、チャージバック、年度途中退会の運用ルールを利用規約・会計処理へ反映する。

### 開発・運用基盤

1. GitHub Actionsを現在の `app`、`lib`、`netlify`、`.next`、`deploy-ui-restore` に合わせて修正する。
2. 実在しない `npm run lint`、`npm test`、`scripts/backup-db.sh` への参照を解消し、実際に成功するCIとバックアップ処理を作る。
3. Node.jsのバージョンをローカル、Dev Container、GitHub Actions、Netlifyで統一する。
4. `AdminView.tsx`、`ResidentView.tsx`、`design.css` の大規模化を、動作確認を行いながら段階的に分割する。
5. 次回のシステム構成変更時は、新しい日付の `system_architecture_recovery_YYYY-MM-DD.md` とHTML版を新規作成する。
