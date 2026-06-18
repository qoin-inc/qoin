# 住民向け決済システム（Step 3）の実装プラン

本プランは、`docs/stripe_action_plan.md` に記載されている「Step 3: 住民向け決済システムの実装」を進行するための詳細設計です。

## User Review Required
> [!IMPORTANT]
> - Netlifyの環境変数に `STRIPE_SECRET_KEY` に加えて、今回新しくWebhookのエンドポイントを作成するため `STRIPE_WEBHOOK_SECRET` と、バックエンド側からSupabaseを安全に更新するための `SUPABASE_SERVICE_ROLE_KEY` (もしくは `SUPABASE_URL` と `SUPABASE_ANON_KEY`) が設定されている必要があります。開発環境(`.env.local`)にもこれらの値を追加してください。
> - 本実装ではプラットフォーム手数料を徴収しない設定（決済金額全額を町内会のStripeアカウントへ売上として計上し、Stripeの決済手数料は町内会側が負担する形式）とします（Direct Charge形式を利用）。

## Proposed Changes

### Frontend (Resident View)

#### [MODIFY] `src/components/ResidentView.tsx`
- **状態管理の追加**: ユーザーの `feeBilling`（会費請求データ）や `stripeAccountId`（町内会のStripeアカウント連携状況）を保持するStateを追加します。
- **データ取得処理の拡張**: 初回ロード時の `useEffect` 内で、`fee_billings` テーブルから該当ユーザーの請求情報を、`neighborhoods` テーブルから町内会のStripe連携状況を取得します。
- **「会費」タブのUI実装**:
  - 請求データが存在し、かつステータスが `pending`（未払い）の場合: 請求金額と「オンラインで支払う」ボタンを表示。
  - すでに支払済（`paid`）の場合: 「今年度の会費は納入済みです」と表示。
  - まだ請求データが存在しない場合、あるいは町内会がStripe連携を行っていない場合はその旨を表示。
- **決済呼び出し処理の実装**: 「オンラインで支払う」ボタン押下時に、新たに作成するAPI `create-checkout-session` を呼び出し、返却されたStripeの決済URLへリダイレクトさせます。

---

### Backend (Netlify Functions)

#### [NEW] `netlify/functions/create-checkout-session.ts`
- Stripe Checkout APIを呼び出すサーバーレス関数を新規作成します。
- リクエストから `feeBillingId`、`amount`、`stripeAccountId` 等を受け取ります。
- `stripe.checkout.sessions.create` を実行し、Stripeの安全な決済画面URL（Checkout URL）を生成してフロントエンドへ返します。
- **Direct Charge形式**: `{ stripeAccount: stripeAccountId }` オプションを付与することで、プラットフォーム手数料を介さず、直接町内会のStripeアカウントへの売上として処理します。
- メタデータ（`metadata`）に `feeBillingId` を埋め込み、後続のWebhook処理で判別できるようにします。

#### [NEW] `netlify/functions/stripe-webhook.ts`
- 決済完了時にStripeから呼び出されるWebhookエンドポイントを新規作成します。
- Stripeのシグネチャ検証を行い、リクエストが安全であることを確認します。
- イベントタイプが `checkout.session.completed` である場合に処理を進行します。
- セッションの `metadata.feeBillingId` を用いて、Supabaseの `fee_billings` テーブルの `status` を `paid` に更新し、`stripe_payment_intent_id` を記録します。

## Verification Plan

### Automated / Manual Verification
1. フロントエンドでの表示確認:
   - テストユーザーでログインし、会費請求が未払いの場合に決済ボタンが表示されるか確認。
2. Stripe Checkoutへのリダイレクト確認:
   - 決済ボタンをクリック後、Stripeのテスト環境決済画面が正しく開き、正しい金額と支払先が表示されているか確認。
3. Webhookの動作確認:
   - Stripe CLI などを利用して、ローカルまたはプレビュー環境でテスト決済を完了させる。
   - `fee_billings` のレコードが正しく `paid` に切り替わるか、また `ResidentView.tsx` の表示が「納入済み」に更新されるかを確認。
