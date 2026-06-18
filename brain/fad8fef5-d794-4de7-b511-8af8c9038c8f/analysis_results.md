# Stripe連携エラーの調査および対応レポート

本日実施したStripeブループリントの検証、およびel-town.jpとの連携時に発生したエラー事象とその原因・対策をまとめました。

---

## 1. 本日発生したエラーと対応内容

### 事象①: ブループリントでの `stripe_balance` エラー
* **エラー内容**: 
  `payment_method_data[type]: stripe_balance` は無効であるため、`customer_balance` などの有効な値を指定する必要があるというエラー。
* **原因**: 
  Stripeの対話型デモツール（ブループリント）側のパラメータ不整合（StripeのAPIアップデートによる仕様変更の未反映）。本来は `customer_balance` を指定すべき箇所に `stripe_balance` が渡されていました。
* **対応**: 
  ブループリントをリセットし、テストヘルパーを活用してスキップ・完了しました。

### 事象②: Webhook待機による画面の点滅
* **エラー内容**: 
  `v2.core.account[configuration.merchant].capability_status_updated` のイベントを待機したまま画面が進行しない状態。
* **原因**: 
  連結アカウント作成後、Stripe側での本人確認（KYC審査）の完了イベント（Webhook）をシステムが非同期で待っていたため。
* **対応**: 
  デモ環境上の「テストヘルパー」を実行し、KYC審査完了をシミュレートすることで待機状態を解除しました。

---

## 2. 現在発生している問題（明日対応予定）

### 事象③: `transfers` 機能単独要求によるエラー（el-town.jp 連携時）
* **エラー内容**:
  `Your platform needs approval for accounts to have requested the transfers capability without the card_payments capability. ...`
* **原因**:
  el-town.jpからStripeに連携しようとした際、**「カード決済（`card_payments`）機能」を要求せず、「送金（`transfers`）機能」だけを要求している**ため、Stripeのセキュリティ・ビジネスルール（マネーロンダリング防止等）による制限に引っかかっています。
  ※通常、カード決済機能なしで送金機能のみを利用するには、Stripe社の個別事前承認が必要となります。

---

## 3. 明日実施する解決手順（予定）

明日は以下の手順でエラーの解消を試みます。

### 【手順1】Stripe管理画面（ダッシュボード）の設定変更（推奨・最優先）
プログラムを書き換えることなく、Stripeの設定だけで解決できる可能性が高いアプローチです。

1. Stripeの管理画面にログインします。
   * ※テスト環境（el-townの開発版など）での検証の場合は、ダッシュボード右上にある **「テストモード」** をオンにしてください。
2. 以下の設定ページを開きます。
   * **[Stripe Connect 設定 (Platform profile)](https://dashboard.stripe.com/settings/connect)**（テストモード時はURL内に `/test/` が含まれることを確認します）
3. ページ内の「機能（Capabilities）」または「登録の初期値」セクションを確認します。
4. **「カード決済（Card payments）」** の項目が無効になっている場合、これを **「有効（Requested）」** に変更して保存します。
   * ※「送金（Transfers）」と「カード決済（Card payments）」の両方が同時に要求される状態にします。
5. 保存後、el-town.jp に戻り、再度「決済システム (Stripe) と連携する」ボタンを押して、エラーが出ずにStripeの画面へ遷移できるか確認します。

### 【手順2】（手順1で解決しない場合）プログラムコードの修正
もしダッシュボードの設定変更だけでエラーが解消しない場合、el-town.jpのソースコード側でアカウント連携URLを作成（`stripe.accountLinks.create` や `stripe.accounts.create`）している箇所を探し、`capabilities` パラメータに以下のように `card_payments` を追加します。

```javascript
// 実装コードのイメージ
capabilities: {
  card_payments: { requested: true }, // 👈 追加
  transfers: { requested: true }
}
```
