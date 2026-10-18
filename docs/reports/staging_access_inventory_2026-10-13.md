# 検証環境の管理画面・Storageアクセス棚卸し（2026-10-13）

対象は `staging-invite-server` ブランチの静的コード調査。実Supabaseへの追加GRANT・Policy・bucket作成は行っていない。

| 画面・処理 | 現在のアクセス経路 | 検証DBでの状態 | 次の設計 |
| --- | --- | --- | --- |
| 役員招待一覧・作成・状態変更 | `AdminView` → `/api/admin/manage-invites` → `service_role` | 2026-10-18に架空データで一覧・招待作成・削除・受諾の実結合試験が成功。認証なし・別町内会・メール不一致・トークン再利用は拒否。詳細は `staging_invite_api_integration_2026-10-18.md` | ブラウザ画面からの操作と、管理画面全体の権限整備は別途確認する |
| 管理画面の初期表示 | `AdminView` → `/api/admin/dashboard`。Bearer Auth と対象町内会の active 役員所属をサーバーで確認してから、対象町内会の行を取得。返信は町内会IDと回覧IDの両方で絞る | 2026-10-18にコード移行。型チェック・ビルド・未認証401・不正ID400に加え、検証DBの一時データで所属なし403、所属あり200、別町内会403、退任後403を確認。試験データ件数は元に戻した。実ブラウザの画面確認は未実施 | 他の直接参照・書込を機能ごとに移す。`SELECT *` を必要な列へ順次絞る |
| 町内会の新規登録 | `SignupTown` が `neighborhoods` と `neighborhood_admins` をブラウザから直接INSERT | 追加Policyなし。役員表のクライアントINSERTは明示的に拒否 | 検証用サーバーAPIへ移し、Authユーザーと新規町内会IDの対応をサーバーで検証する |
| システム管理画面 | `SystemAdminView` が複数町内会の表をブラウザから直接SELECTし、標準会費をINSERT/RPC実行、町内会と関連表を直接DELETE | ID判定の構造案はあるが、広域のクライアント権限は未付与 | 広域操作をサーバーAPIへ移し、検証用AuthユーザーIDをサーバーとDBの両方で照合する。直接の全件SELECT/DELETEを許可しない |
| 添付ファイル | `AdminView` が `attachments` bucketへブラウザから直接uploadし、公開URLを取得 | bucket・Storage Policyは未作成 | 保存パスと公開範囲を決め、町内会単位のアップロード権限を設計する。個人情報を含む添付の公開URL利用も見直す |

## 優先順

1. 検証用管理者AuthユーザーIDの適用・検証と、役員招待APIの実結合試験は2026-10-18に完了。
2. `SignupTown` と `SystemAdminView` の直接書込をサーバー側へ移す設計を固める。
3. `AdminView` の初期表示以外（会計・役員画面内の追加取得、直接書込、Storage）を機能ごとに移す。別町内会・退任者の拒否と正常系の画面確認を検証環境で行う。

Netlifyの検証サイトは未デプロイ。本番Supabase・本番Netlifyは変更していない。
