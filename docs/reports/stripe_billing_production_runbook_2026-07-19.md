# Stripe請求設定・本番稼働ランブック

- 作成日: 2026-07-19
- 対象: el-townシステム使用料、町内会・自治会の会費
- 本番URL: `https://el-town.jp`
- 基準コミット: `fcea18160c000b5912abe4d4708f7536b00963fb`
- 本番デプロイID: `6a5c9ac8cfcba500740400e7`
- 本番稼働状態: システム使用料の自動処理は停止スイッチ付き。実際の請求開始日までは `SYSTEM_BILLING_ENABLED=false` を維持する。

## 1. この文書の使い方

Stripeに関する問い合わせを受けた場合は、最初に「システム使用料」と「団体会費」のどちらかを確認する。両者は資金の受取人とStripeアカウントが異なる。

| 区分 | 請求者・受取人 | Stripe上の管理先 | 現在の決済方法 |
|---|---|---|---|
| el-townシステム使用料 | el-town | el-townプラットフォームアカウント | カード自動決済、Stripe銀行振込 |
| 町内会・自治会の会費 | 各町内会・自治会 | 各団体のStripe Connect Expressアカウント | カード。Apple Pay・Google Payはカードウォレットとして表示可能 |

システム使用料をConnectアカウントで回収したり、会費をel-townプラットフォームアカウントで回収したりしない。会計主体、返金責任、Stripe手数料の帰属が変わるためである。

## 2. 現在の到達状況

### 実装・デプロイ済み

- システム使用料の決済方法として、カード自動決済とStripe銀行振込を選択できる。
- カードは初回登録後、Stripe Customerのデフォルト支払方法として保存する。
- 毎月16日9:00 JSTに接続数と適用単価を固定するScheduled Functionを実装した。
- 翌月1日9:00 JSTに数量・単価・消費税を含むStripe請求書を発行するScheduled Functionを実装した。
- `SYSTEM_BILLING_ENABLED` が厳密に `true` の場合だけ、定期処理と管理画面からの実行を許可する。
- Stripe請求書の入金・失敗・追加認証などをWebhookでDBへ反映する。
- 団体会費は各団体のConnectアカウントへの直接決済として実装した。
- 団体会費のStripe手数料を支出科目「支払手数料」へ自動計上する実装をデプロイした。
- 2026-07-19の本番デプロイで基準コミット `fcea181` まで反映・検証済み。

### Stripe画面で実施済みとして記録するもの

- el-townプラットフォームアカウントで銀行振込を有効化した。
- Stripe請求書の表示言語を日本語化し、el-townロゴを登録した。

### 本番開始前に再確認が必要なもの

- Netlifyの `SYSTEM_BILLING_ENABLED` が `false` であること。
- `SYSTEM_BILLING_CRON_SECRET` が本番Netlifyへ登録されていること。
- 本番Stripe Webhookのイベント選択と署名シークレットがNetlify設定と一致すること。
- Netlify Functionsで2つの定期関数が `Scheduled` と表示されること。
- 本番DBへ必要SQLが適用済みで、RLSが意図どおりであること。
- 0円または少額のテスト用請求ではなく、本番開始前の管理者確認用データで数量・単価・税・支払期日を確認すること。

## 3. システム使用料の設計

### 請求周期

1. 毎月16日9:00 JSTに、その日時点のLINE連携済みアカウント数と料金単価を固定する。
2. 対象月のプッシュ通知超過数を集計する。
3. 翌月1日9:00 JSTにStripe請求書を発行する。
4. カード選択団体は保存済みカードへ自動請求する。
5. 銀行振込選択団体はStripe請求書に表示された団体専用仮想口座へ振り込む。
6. Stripeの `invoice.paid` を受信し、el-townの請求を入金済みにする。

### 請求明細

| Stripe請求書の項目 | 数量 | 単価 |
|---|---:|---:|
| 接続数利用料 | 16日時点の連携済みアカウント数 | `monthly_household_price` |
| プッシュ通知超過料 | 対象月の無料枠超過件数 | `push_unit_price` |

- 消費税は設定された `tax_rate` に対応するStripe Tax Rateを使用する。
- 16日の固定処理に失敗して請求行が存在しない場合、1日の処理が補完し、`snapshot_source=invoice_fallback` を記録する。
- `stripe_invoice_id` が保存済み、または入金済みの請求は再発行しない。

### カード自動決済

- 初回のみStripe Checkoutの `setup` モードでカードを登録する。
- 自動回収への同意日時を `automatic_collection_consent_at` に記録する。
- 月次請求は `charge_automatically` を使用する。
- カード未登録は `card_setup_required` として請求書発行を保留する。
- 追加認証が必要な場合は `invoice.payment_action_required`、失敗時は `invoice.payment_failed` を反映する。

### Stripe銀行振込

- 月次請求は `send_invoice` を使用する。
- 決済手段は `customer_balance`、資金種別は `bank_transfer`、日本の銀行振込は `jp_bank_transfer` を指定する。
- 仮想口座はStripe請求書PDFと決済ページに表示される。
- 着金後の消し込みはStripeが行い、el-townはWebhookで結果を同期する。
- 過入金、不足入金、振込名義不一致などは自動処理だけで完結しない場合があるため、Stripeの顧客残高とel-townの請求状態を照合する。

## 4. システム使用料の本番設定

### Supabase

次の順に適用する。

1. `docs/sql/system_usage_billing_columns_2026-07-07.sql`
2. `docs/sql/system_usage_stripe_billing_2026-07-19.sql`

確認対象:

- `system_usage_billings`
- `system_usage_payment_profiles`
- 団体の認証済み管理者だけに参照を許可するRLS
- ブラウザからの任意作成・更新を許可せず、サーバーAPIだけが更新できること

### Netlify環境変数

値そのものはこの文書やGitへ記載しない。

| 変数 | 用途 | 開始前の状態 |
|---|---|---|
| `STRIPE_SECRET_KEY` | el-town本番Stripe API | 本番キーが必要 |
| `STRIPE_WEBHOOK_SECRET` | el-townアカウントイベントの署名検証 | 本番Webhookと一致させる |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Connectイベントの署名検証 | 別宛先を使用する場合に設定 |
| `SUPABASE_SECRET_KEY` | Webhook・定期処理のDB更新 | サーバー専用。公開禁止 |
| `SYSTEM_BILLING_CRON_SECRET` | 定期請求APIの保護 | 推測困難な値を設定 |
| `SYSTEM_BILLING_ENABLED` | 請求全体の停止スイッチ | 開始前 `false`、開始時だけ `true` |

### Stripe Webhook

URL: `https://el-town.jp/api/webhooks/stripe`

el-townアカウント側で必要なイベント:

- `checkout.session.completed`
- `setup_intent.succeeded`
- `invoice.finalized`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `invoice.voided`

Connect側で必要なイベント:

- `account.updated`
- 会費Checkoutの `checkout.session.completed`
- 手数料取得と入金同期に必要な決済イベント

### Netlify Scheduled Functions

| 関数 | Cron（UTC） | 日本時間 |
|---|---|---|
| `system-usage-snapshot` | `0 0 16 * *` | 毎月16日9:00 |
| `system-usage-invoice` | `0 0 1 * *` | 毎月1日9:00 |

## 5. システム使用料の本番開始手順

1. 本番DBのテーブル・列・RLSを確認する。
2. Stripe本番Customerをテスト対象団体1件だけで作成する。
3. カード登録または銀行振込選択を行い、団体管理画面の状態を確認する。
4. Stripe Webhookのテスト送信でHTTP 2xxとDB反映を確認する。
5. システム管理画面で対象月の16日実績を手動確定し、数量と単価を確認する。
6. 本番請求書の手動発行は、画面が要求する対象月を入力して実行する。
7. Stripe請求書の日本語、ロゴ、請求先、数量、単価、税、支払期日を確認する。
8. カードまたは銀行振込の入金を行い、Stripeとel-town双方で入金済みになることを確認する。
9. 問題がなければ `SYSTEM_BILLING_ENABLED=true` に変更する。
10. Netlifyの次回実行日時が16日・1日の9:00 JSTであることを確認する。

開始直後は対象団体を限定する。異常時はまず `SYSTEM_BILLING_ENABLED=false` に戻す。発行済みStripe請求書は停止スイッチだけでは取り消されないため、Stripe上で個別に無効化・返金判断を行う。

## 6. 町内会・自治会の会費請求

### 採用方式

- 各団体にStripe Connect Expressアカウントを作成する。
- 会員から各団体への直接決済とする。
- 契約主体・会費の受取人は各団体であり、el-townは登録導線、決済画面、Webhook同期、領収書、会計連携を提供する。
- Stripeの本人確認・審査・口座登録はStripe Hosted Onboardingを使用する。

### el-town側で標準化するもの

- Expressアカウントの作成とStripe登録画面への導線
- 団体名と管理者メールアドレスの事前入力
- 本人確認・追加情報・審査状態の同期
- `charges_enabled` と `payouts_enabled` の確認
- 会費Checkoutの作成
- 決済成功のWebhook反映
- 領収書表示
- Stripe手数料を支出科目「支払手数料」へ自動計上
- 将来追加する決済方法の「未申請・審査中・利用可能・要追加情報」の状態表示

### 団体側で必須となるもの

- 団体名、所在地、代表者、連絡先
- 本人確認とStripeが要求する必要書類
- 売上金の振込先口座
- 会費名称、金額、対象年度、納期限、減免・免除規定
- 請求書・領収書へ表示する発行者情報
- 適格請求書発行事業者番号（登録している団体のみ）
- 返金、二重払い、年度途中退会の運用判断

Stripeの必要情報は国、事業形態、要求する決済機能により変わるため、el-townが本人確認項目を固定せず、Stripe Hosted Onboardingに最新要件を表示させる。

### 現在利用できる会費決済

#### カード

- 実装済み。Stripe Checkoutの `payment` モードを使用する単発決済である。
- Visa等のカードブランドは、ConnectアカウントとStripeの利用資格に従う。
- 本番環境ではStripe本番キーと `charges_enabled=true` を必須とする。

#### Apple Pay・Google Pay

- Stripe Checkoutではカードウォレットとして扱われる。
- 現在の `payment_method_types: ["card"]` の範囲で、対応端末・ブラウザ・登録カード等の条件を満たす会員に表示される。
- 常に全端末へ表示されるものではない。本番開始前にiPhone/SafariとAndroid/Chromeの実機で確認する。
- 会費の支払方法としてはカード決済実績に含める。

### 未実装の会費決済

#### 銀行振込

- Stripe自体は日本円の仮想口座と自動消し込みに対応するが、団体会費には未実装である。
- 現在のシステム使用料用銀行振込設定は、会費受取用Connectアカウントへは引き継がれない。
- 実装時は各Connectアカウント上にCustomer、Invoice、Invoice Itemを作成し、`send_invoice` と `customer_balance / jp_bank_transfer` を使用する。
- 各Connectアカウントで銀行振込が利用可能であることを確認する。
- 過不足入金、重複振込、返金、年度の対応付けを実装・運用する必要がある。

#### PayPay

- 団体会費には未実装である。
- 日本円の単発決済として利用可能だが、自動継続決済やカード保存の代わりにはならない。
- Stripe Connectでの利用は申請が必要で、各接続アカウントの `paypay_payments` Capabilityが有効でなければならない。
- PayPayの登録審査には通常約2週間、Connectではさらに時間がかかる可能性がある。
- 団体別に会費内容・金額、決済導線、特定商取引法に基づく表記等の審査情報が必要になる。
- el-townは入力ひな型、申請、状態取得、承認後の自動表示を標準化できるが、Stripe・外部パートナーの承認を一括保証できない。

## 7. 会費の会計処理

- 会計期内に退会した会員であっても、その会計期に発生した会費実績から除外しない。
- Stripeの会費入金は会費の総額を収入実績とする。
- Stripeが控除した決済手数料は、支出科目「支払手数料」へ別途計上する。
- 銀行口座への振込額だけを会費収入として計上しない。総額収入と手数料支出を分ける。
- 自動計上ではStripe Balance Transactionの手数料額を取得し、決済ID単位で重複登録を防止する。
- 返金・チャージバック時の会計処理は別取引として記録し、元の会費実績を無条件に削除しない。

## 8. 重要な運用ルール

### 二重アカウント防止

- DBにConnectアカウントIDがない場合も、町内会IDのmetadata、または団体名と管理者メールの一致で既存アカウントを検索する。
- 一意に特定できない場合は新規作成せず、Stripeサポートを含めて確認する。

### Webhook

- Stripe APIキーとWebhook署名シークレットは別物である。
- 署名なし、または署名不一致のリクエストを受け付けない。
- Connectイベントには `event.account` が含まれるため、その接続先アカウントの文脈で決済・手数料情報を取得する。
- 同じイベントの再送を前提に、DB更新と手数料計上を冪等にする。

### 返金・紛争・マイナス残高

- 団体会費の直接決済では、通常、決済手数料・返金・紛争は接続先団体の取引として扱われる。
- Expressアカウントの残高で紛争・返金を補えない場合、プラットフォーム側に最終的な負担が発生する可能性がある。
- 利用規約に、手数料、返金、チャージバック、マイナス残高の負担者を明記する。

## 9. 問い合わせ時の回答基準

| 質問 | 回答の要点 |
|---|---|
| システム使用料は自動請求されるか | 16日に数量固定、翌月1日に請求。カードは自動決済、銀行振込は請求書送付。開始までは停止スイッチOFF |
| 会費の受取口座は誰のものか | 各団体のConnectアカウントに登録した団体口座 |
| 団体は何を設定するか | 本人確認、必要書類、振込口座、団体固有情報、会費規則 |
| Apple Pay・Google Payは使えるか | カードウォレットとして条件を満たす端末に表示。実機確認が必要 |
| PayPayはすぐ使えるか | 未実装。Connect申請と団体ごとの審査・Capability有効化が必要 |
| 会費の銀行振込は使えるか | 未実装。システム使用料の銀行振込設定とは別にConnect側へ実装が必要 |
| Stripe手数料はどう記帳するか | 会費総額を収入、Stripe手数料を支出科目「支払手数料」へ別記 |
| 退会者の当期会費は消えるか | 消さない。会計期内に発生した実績へ含める |

## 10. 関連ファイル

### システム使用料

- `docs/integrations/system_usage_stripe_billing_2026-07-19.md`
- `docs/sql/system_usage_billing_columns_2026-07-07.sql`
- `docs/sql/system_usage_stripe_billing_2026-07-19.sql`
- `lib/systemUsageBillingServer.ts`
- `app/api/system-usage/payment-profile/route.ts`
- `app/api/system-usage/create-setup-session/route.ts`
- `app/api/system-usage/billing-run/route.ts`
- `netlify/functions/system-usage-snapshot.mts`
- `netlify/functions/system-usage-invoice.mts`

### 団体会費・Connect

- `docs/integrations/stripe_live_connect_policy_2026-07-07.md`
- `lib/stripeConnectServer.ts`
- `app/api/admin/stripe/create-account-link/route.ts`
- `app/api/admin/stripe/sync/route.ts`
- `app/api/fees/create-checkout-session/route.ts`
- `app/api/webhooks/stripe/route.ts`
- `docs/sql/stripe_fee_auto_settlement_2026-07-19.sql`

## 11. 公式参照先

- Stripe Connectの直接決済: https://docs.stripe.com/connect/direct-charges
- Connectでの請求書: https://docs.stripe.com/invoicing/connect
- Stripe銀行振込: https://docs.stripe.com/payments/bank-transfers
- 請求書の銀行振込: https://docs.stripe.com/invoicing/bank-transfer
- Hosted Onboarding: https://docs.stripe.com/connect/hosted-onboarding
- Connect Capability: https://docs.stripe.com/connect/account-capabilities
- PayPay: https://docs.stripe.com/payments/paypay
- 日本でのPayPay審査: https://support.stripe.com/questions/accepting-paypay-payments-for-japan-based-stripe-accounts?locale=ja-JP

## 12. 変更時の更新ルール

次のいずれかを変更した場合、この文書の日付・基準コミット・到達状況・本番開始チェックリストも更新する。

- Stripeの決済手段
- Connectの課金方式
- 請求日、数量確定日、支払期日
- 手数料・返金・退会者の会計方針
- WebhookイベントまたはURL
- Netlify環境変数
- SQL、RLS、請求テーブル
- PayPay・銀行振込の実装または審査状況
