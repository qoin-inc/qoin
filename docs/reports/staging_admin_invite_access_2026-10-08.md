# 役員招待の検証DB権限とローカルテスト（2026-10-08）

対象は `staging-invite-server` ブランチの招待フロー。`supabase/staging-baseline/20261007_schema_DENY_BY_DEFAULT.sql` の後に、使い捨てDBで検証した。Supabase ProjectへのSQL適用、Netlifyデプロイ、本番設定変更は行っていない。

## 必要なアクセス

| 操作 | 呼び出し元 | DBアクセス | 検証時の方針 |
| --- | --- | --- | --- |
| 招待URLの事前確認 | `/api/admin/invite-details` | `service_role` で `neighborhood_admins` と `neighborhoods` を読む | 匿名ロールに直接の表権限を与えない。APIは町内会名と招待状態だけ返す。 |
| 招待の受諾 | `/api/admin/accept-invite` | 認証トークンをAuthで確認し、`service_role` で対象行を条件付きUPDATE | メール一致、期限、未使用状態をサーバーで確認する。ブラウザにUPDATEを与えない。 |
| 招待メールの送信 | `/api/admin/send-admin-invite` | ログインユーザーの所属を `authenticated` で確認し、対象の招待行を `service_role` で読む | 所属確認に必要な `neighborhood_admins` の4列だけを読めるようにする。 |
| 役員一覧・招待作成・削除・退任・復活 | `components/AdminView.tsx` → `/api/admin/manage-invites` | サーバーでログインと対象町内会の有効な所属を確認し、`service_role` で対象町内会の行だけを操作 | 一覧から招待トークンとAuth IDを除外。新規招待トークンは作成した役員への応答にだけ含める。 |
| 招待メールの再送 | `components/AdminView.tsx` → `/api/admin/send-admin-invite` | サーバーで招待行を確認 | 一覧にトークンを返さずに再送する。 |
| Storage | 役員招待フロー | 呼び出しなし | 今回はbucket・Policy・GRANTを追加しない。 |

## 今回作成した最小権限案

`supabase/staging-baseline/20261008_admin_invite_membership_LOCAL_ONLY.sql` は、`authenticated` に `neighborhood_admins` の `id`、`neighborhood_id`、`admin_auth_id`、`status` のSELECTだけを付与し、RLSで「自分のAuth IDに紐づくactive行」だけを返す。`anon`、招待トークン列、クライアントのINSERT/UPDATE/DELETEは拒否のまま。`service_role` の既存権限は使う。このSQLにはローカル実行ガードがあり、実Projectにはそのまま適用できない。

`AdminView` の役員管理操作はサーバーAPIへ移した。サーバーは町内会ID、対象役員ID、状態遷移、20名上限を再確認し、別町内会の行を操作しない。期限切れ・退任済みの同一メールは既存行を招待待ちへ戻し、古いAuth IDを消す。新しいAPIと既存の招待関連APIは `STAGING_SUPABASE_PROJECT_REF` とSupabase URLのホスト名が一致しない場合に503で停止する。検証サイトに設定するRefは管理画面で照合してから入力する。設定がない状態では招待フローを利用できない。招待メールと画面に表示するURLは `https://el-town-staging.netlify.app` を使い、本番ドメインのURLを生成しない。

検証用システム管理者は**メールアドレスではなくAuthユーザーID（UUID）で指定**する。`memberships` APIは `STAGING_SYSTEM_ADMIN_AUTH_ID` とログインユーザーIDの一致だけで画面用フラグを返すように変更した。IDが未設定なら常にfalse。一部UIには本番メール固定の表示フィルターが残り、baseline内の `is_el_town_system_admin` は常にfalseなので、DB上のシステム管理権限はまだ有効にしない。

## ローカルテスト結果

PGlite 0.5.8のメモリ内DBにbaselineとSQL案を適用し、架空の町内会A・B、active役員A・B、pending候補者を使って確認した。

- ローカル実行ガードは、設定がない場合に適用を拒否した。
- 役員Aは自分のactive行だけ、役員Bは自分のactive行だけ読めた。pending候補者は自分の行も読めなかった。
- `authenticated` による招待トークン列のSELECTと表のINSERT/UPDATE、`anon` によるSELECTは拒否された。
- `service_role` は招待行を更新できた。Policyはこのテーブルに1件だけ。
- 招待受諾ロジックの既存テスト3件、baselineの静的拒否チェックも通過した。
- サーバーの20名上限・状態変更ルール、接続先ガード、システム管理者ID照合の単体テストを追加した。TypeScript型チェックとNext.jsビルドを通過した。APIと実Supabaseの結合テストは未実施。

再実行はリポジトリのルートで行う。PGliteはリポジトリ外の一時ディレクトリへ入れる。

```powershell
npm install --prefix "$env:TEMP\el-town-pglite-test" --no-save --ignore-scripts @electric-sql/pglite
node scripts/test-staging-admin-invite-access-pglite.mjs "$env:TEMP\el-town-pglite-test\node_modules\@electric-sql\pglite\dist\index.js"
```

## 検証Projectへ適用する前の残作業

1. 検証用システム管理者IDを確定して環境変数へ設定し、DB関数と残るUIのメール固定判定をID方式へ統一する。他のIDや同じメール文字列だけではDB権限が得られないことを実環境でテストする。
2. 招待以外の管理画面で必要な表・関数・Storageの権限を別途設計する。現状の拒否初期状態では管理画面全体は動かない。`SignupTown` と `SystemAdminView` にも役員表への直接アクセスが残る。
3. APIと実Supabaseの結合テストを架空データで行う。役員数上限と最後の役員の退任判定は現在アプリ側の確認であり、同時実行まで原子的に防ぐDB制約は未実装。
4. 実Supabaseに近いPostgreSQL環境で権限を再検証し、検証Project Ref、費用、秘密情報の保管先と適用手順を照合する。本番へリンクされたCLIから無指定のDB変更コマンドを実行しない。
