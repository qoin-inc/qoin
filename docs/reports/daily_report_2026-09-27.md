# 日報 2026-09-27

対象：el-town。日本時間。本日の確認・資料更新に基づく。

## 本日の実績

### システム構成・災害復旧資料の更新

- 現行の本番構成、GitHub・Netlifyのデプロイ記録、Supabase・Stripe・LINEの接続関係と復旧対象を調査し、2026-09-27版の構成資料に整理した。
- 現行の本番URLは `https://el-town.jp`。独立した検証用Netlify siteとSupabase Projectは未作成であることを記録した。
- 2026-07-19版のMarkdown・HTML原本は `docs/reports/old/` に保管した。
- 作成先：`docs/reports/system_architecture_recovery_2026-09-27.md`。既存資料の閲覧用HTML版も `docs/reports/system_architecture_recovery_2026-09-27.html` にある。本日報のHTML版は作成していない。
- 最初の資料更新コミット：`d9a2ce8cf89acbd2ee92e2a9caedb6526a27c15c`。

### 検証環境のID作成手順の整理

- 検証用Supabase Project、Netlify site、LINE Provider・公式アカウント・LINE Login・Messaging API・LIFF、Stripe Sandboxの作成順と、発行されるID・URLを構成資料に追記した。
- 既存の管理者アカウントやGitHubリポジトリは利用可能だが、本番のProject・Site・チャネル・決済データと検証環境の接続先を分ける方針を明記した。
- 検証用の秘密値はGitやレポートに書かず、本番会員の移行も行わず、架空データを使う方針を記録した。
- 追記のローカルコミット：`6bdaf292a0fa1c3fa006db0f1bfa25092181f407`。

### 確認した状態

- 構成資料のMarkdown・HTMLの整合、HTMLの目次とPC・スマートフォン表示を確認した。
- 検証環境のID・外部リソースは本日時点で作成していない。検証環境や本番へのデプロイも行っていない。
- 構成資料と本日報を既存のGitHubリポジトリ `qoin-inc/qoin` の `deploy-ui-restore` ブランチへ送信した。本番サイトへのデプロイは行っていない。

## 次回やること

### 1. 検証用リソースの作成準備

- Supabaseの契約プラン・追加費用と、Netlify・LINE・Stripe各管理画面での作成権限を確認する。
- 構成資料に記載した順序で検証用リソースを作成し、発行されたID・URLを環境台帳に記録する。

### 2. アプリとデプロイ設定の分離

- 本番LIFF IDの固定値、Stripeの環境判定、デプロイ先の選択を修正し、検証用環境変数を設定する。
- 空のSupabase Projectに適用できるbaseline migration、RLS・GRANT・Storage Policy、架空seedを整備する。

### 3. 検証と本番反映の判断

- 検証用LINEのログイン・通知、団体分離、Stripe Sandboxの会費決済とWebhookを確認する。
- 検証結果を踏まえて本番反映を別途判断する。

本日報は記録のみ。次回の自動起動・通知は予約していない。
