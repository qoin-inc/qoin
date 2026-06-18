# 会費請求の作成＆領収書発行機能

## 背景

現在、管理画面の「会費管理」タブ（`fee_records`テーブル）と会員側の支払い画面（`fee_billings`テーブル）が連動していません。管理画面で会費を設定しても、会員の画面に反映されない状態です。

また、決済完了後に会員が領収書を確認する機能もありません。

## 実装する機能

### 機能1：請求を作成する（fee_records → fee_billings 連携）

管理画面の「会費管理」タブに **「未納者に請求を作成」ボタン** を追加し、`fee_billings`テーブルにレコードを一括作成します。

**フロー：**
1. 役員が「会費管理」タブで会費設定済み
2. 「未納者に請求を作成」ボタンを押す
3. `fee_records` の未納会員に対し、`fee_billings` にレコードが作成される
4. 会員の画面に「会費のお願い」＋「オンラインで支払う」が表示される

> [!IMPORTANT]
> 請求額は `fee_records.expected_amount` があればその値、なければ `system_settings.annual_fee_amount`（デフォルト3,000円）を使用します。

### 機能2：領収書の表示（決済完了後）

会員の会費画面で、支払い完了後に **領収書を表示・ダウンロードできるボタン** を追加します。

**領収書に含む情報：**
- 町内会名
- 会員名
- 支払金額
- 支払日時
- 決済ID（Stripe Payment Intent ID）

> [!NOTE]
> ブラウザの印刷機能を使ったPDF保存で対応します。外部サービスは不要です。

---

## Proposed Changes

### 管理画面（AdminView.tsx）

#### [MODIFY] [AdminView.tsx](file:///C:/Users/info/.gemini/antigravity/scratch/qoin/src/components/AdminView.tsx)

- 会費管理タブに **「未納者に請求を作成」ボタン** を追加
- ボタン押下時に以下を実行：
  1. `fee_records`から未納の会員一覧を取得
  2. 各会員の`roster_id`に対し`fee_billings`テーブルに`INSERT`
  3. `amount`は個別設定値 or デフォルト年会費
  4. 既に`fee_billings`にpending状態のレコードがある場合はスキップ（重複防止）
- 作成済み件数を確認メッセージで表示

---

### 会員画面（ResidentView.tsx）

#### [MODIFY] [ResidentView.tsx](file:///C:/Users/info/.gemini/antigravity/scratch/qoin/src/components/ResidentView.tsx)

- 支払い完了画面（`feeBilling.status === 'paid'`）に **「領収書を表示」ボタン** を追加
- ボタン押下で領収書モーダルを表示
- 領収書モーダルの内容：
  - 町内会名、会員名、金額、支払日、決済ID
  - 「印刷 / PDF保存」ボタン（`window.print()`で対応）

---

### Webhook（fee_records 同期）

#### [MODIFY] [stripe-webhook.ts](file:///C:/Users/info/.gemini/antigravity/scratch/qoin/netlify/functions/stripe-webhook.ts)

- 決済完了時、`fee_billings` の更新に加えて `fee_records` の `paid_amount` も同期更新
- これにより管理画面の会費管理タブにもリアルタイムで反映

---

## Open Questions

> [!IMPORTANT]
> **デフォルト年会費の変更UIについて**
> 現在デフォルト年会費（3,000円）はコード上のハードコードです。管理画面からデフォルト年会費を変更できるUIを追加しますか？それとも3,000円固定でよいですか？

---

## Verification Plan

### 動作確認
1. 管理画面で「未納者に請求を作成」を実行 → fee_billings にレコードが作成されることを確認
2. 会員画面で「会費のお願い」が表示されることを確認
3. 決済完了後「領収書を表示」ボタンが表示されることを確認
4. 領収書モーダルの印刷機能が動作することを確認
5. ビルド成功を確認してデプロイ
