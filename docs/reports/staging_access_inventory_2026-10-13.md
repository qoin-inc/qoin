# 検証環境の管理画面・Storageアクセス棚卸し（2026-10-13）

対象は `staging-invite-server` ブランチの静的コード調査。実Supabaseへの追加GRANT・Policy・bucket作成は行っていない。

| 画面・処理 | 現在のアクセス経路 | 検証DBでの状態 | 次の設計 |
| --- | --- | --- | --- |
| 役員招待一覧・作成・状態変更 | `AdminView` → `/api/admin/manage-invites` → `service_role` | 役員の本人所属4列のみクライアント読取可。APIの実結合試験は未実施 | 検証用AuthユーザーIDとサーバー秘密キーを設定し、架空データで許可・拒否を確認する |
| 管理画面の初期表示 | `AdminView` が `neighborhoods`、`resident_rosters`、`circulars`、会費・請求・施設等をブラウザから直接SELECT | 構造baselineの拒否初期状態では大半が取得不可 | 各表・列・操作を町内会単位で分けてPolicyを作る。`SELECT *` を必要な列へ絞る |
| 町内会の新規登録 | `SignupTown` が `neighborhoods` と `neighborhood_admins` をブラウザから直接INSERT | 追加Policyなし。役員表のクライアントINSERTは明示的に拒否 | 検証用サーバーAPIへ移し、Authユーザーと新規町内会IDの対応をサーバーで検証する |
| システム管理画面 | `SystemAdminView` が複数町内会の表をブラウザから直接SELECTし、標準会費をINSERT/RPC実行、町内会と関連表を直接DELETE | ID判定の構造案はあるが、広域のクライアント権限は未付与 | 広域操作をサーバーAPIへ移し、検証用AuthユーザーIDをサーバーとDBの両方で照合する。直接の全件SELECT/DELETEを許可しない |
| 添付ファイル | `AdminView` が `attachments` bucketへブラウザから直接uploadし、公開URLを取得 | bucket・Storage Policyは未作成 | 保存パスと公開範囲を決め、町内会単位のアップロード権限を設計する。個人情報を含む添付の公開URL利用も見直す |

## 優先順

1. 検証用管理者AuthユーザーIDを確定し、DBのID判定案を安全に適用・検証する。
2. 役員招待APIに必要な秘密キーと架空の所属データだけで結合試験を行う。管理画面全体のGRANTを先に増やさない。
3. `SignupTown` と `SystemAdminView` の直接書込をサーバー側へ移す設計を固める。
4. 管理画面の読み取りPolicyとStorageの用途を機能ごとに設計し、使い捨てDBで他町内会・匿名・退任者の拒否を確認する。

Netlifyの検証サイトは未デプロイ。本番Supabase・本番Netlifyは変更していない。
