# 会員メニュー（ResidentView）からのStripeオンライン決済実装プラン

本プランは、アクションプラン「Step 3: 住民向け決済システムの実装」に基づき、会員が自身のスマホ画面から町内会費をオンライン決済できるようにする機能の実装計画です。

## User Review Required
> [!IMPORTANT]
> - 本実装後、実際に決済テストを行うには、Stripeの開発者ダッシュボードからテスト環境用のAPIキーとWebhookシークレットを取得し、Netlify（またはローカル環境）の環境変数に設定する必要があります。
> - プラットフォーム（El-Town）が徴収する仲介手数料（Application Fee）について、今回は「0円（徴収しない）」設定で実装します。（決済ごとの3.6%の手数料はStripe社が自動で引き、残額が町内会に振り込まれます）もしシステム側で追加手数料を徴収する方針があればお知らせください。

## Proposed Changes

### フロントエンド（会員画面）
---
#### [MODIFY] [ResidentView.tsx](file:///c:/Users/info/.gemini/antigravity/scratch/qoin/src/components/ResidentView.tsx)
- **データ取得ロジックの追加**:
  - コンポーネントロード時に、Supabaseの `fee_billings` テーブルから対象住民（`roster_id`）の今年の請求データを取得します。
  - 同時に `neighborhoods` テーブルから町内会の `stripe_account_id`（連携状況）を取得します。
- **「会費（fee）」タブのUI更新**:
  - 現在「準備中」となっている画面を改修します。
  - **請求がない/支払済の場合**: 「今年度の会費は納入済みです」と表示します。
  - **未納（pending）の場合**: 「未納の会費: ¥〇〇」と大きく表示し、「オンラインで支払う（クレジットカード・PayPay対応）」という決済ボタンを配置します。
  - （※町内会がStripe連携をしていない場合は「現在オンライン決済は準備中です」と表示します）
- **決済セッション呼び出し処理**:
  - 決済ボタンが押された際、後述の `create-checkout-session` APIを呼び出し、返却された決済URL（Stripe Checkout画面）へ自動遷移させます。

### バックエンド（Netlify Functions）
---
#### [NEW] [create-checkout-session.ts](file:///c:/Users/info/.gemini/antigravity/scratch/qoin/netlify/functions/create-checkout-session.ts)
- Stripe Checkoutセッションを生成するサーバーレス関数を新規作成します。
- リクエストから金額(`amount`)、町内会のStripe ID(`stripeAccountId`)、請求ID(`billingId`)などを受け取ります。
- 決済成功時の戻り先(`success_url`)とキャンセル時の戻り先(`cancel_url`)を指定し、Stripeが提供する安全な支払いページURLをフロントエンドに返します。

#### [NEW] [stripe-webhook.ts](file:///c:/Users/info/.gemini/antigravity/scratch/qoin/netlify/functions/stripe-webhook.ts)
- Stripe上での決済完了（`checkout.session.completed` イベント）を受け取るWebhook関数を新規作成します。
- 決済が成功したという通知をStripeから安全に（署名検証付きで）受け取ります。
- 受け取った通知に含まれるメタデータ（`billingId`等）を使って、Supabaseの `fee_billings` テーブルの該当レコードのステータスを `paid`（納入済）に自動更新します。

## Verification Plan

### Automated Tests
- フロントエンドでのビルド・型チェック (`npm run build`) を実行し、追加したコンポーネントやAPIのエラーがないか確認します。

### Manual Verification
1. **画面表示の確認**: 開発環境で `ResidentView` を開き、会費タブに未納金額と「オンラインで支払う」ボタンが正しく表示されることを確認します。
2. **決済フローのテスト**: 決済ボタンを押し、Stripeのテスト用Checkout画面が立ち上がることを確認します（テスト用カード番号を使用して決済完了まで確認）。
3. **Webhookによる状態更新の確認**: テスト決済完了後、データベース（`fee_billings`）が自動的に `paid` に切り替わり、再度 `ResidentView` を開いた時に「納入済み」と表示されることを確認します。
