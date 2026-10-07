# 役員招待の検証DB権限とローカルテスト（2026-10-08）

対象は `staging-invite-server` ブランチの招待フロー。`supabase/staging-baseline/20261007_schema_DENY_BY_DEFAULT.sql` の後に、使い捨てDBで検証した。Supabase ProjectへのSQL適用、Netlifyデプロイ、本番設定変更は行っていない。

## 必要なアクセス

| 操作 | 呼び出し元 | DBアクセス | 検証時の方針 |
| --- | --- | --- | --- |
| 招待URLの事前確認 | `/api/admin/invite-details` | `service_role` で `neighborhood_admins` と `neighborhoods` を読む | 匿名ロールに直接の表権限を与えない。APIは町内会名と招待状態だけ返す。 |
| 招待の受諾 | `/api/admin/accept-invite` | 認証トークンをAuthで確認し、`service_role` で対象行を条件付きUPDATE | メール一致、期限、未使用状態をサーバーで確認する。ブラウザにUPDATEを与えない。 |
| 招待メールの送信 | `/api/admin/send-admin-invite` | ログインユーザーの所属を `authenticated` で確認し、対象の招待行を `service_role` で読む | 所属確認に必要な `neighborhood_admins` の4列だけを読めるようにする。 |
| 役員一覧・招待作成・削除・再発行 | `components/AdminView.tsx` | 現状、ブラウザから `neighborhood_admins` に直接SELECT `*` / INSERT / UPDATE / DELETE | **未対応**。トークン列や任意の役員変更をクライアントへ許可せず、サーバー経路へ移す。 |
| Storage | 役員招待フロー | 呼び出しなし | 今回はbucket・Policy・GRANTを追加しない。 |

## 今回作成した最小権限案

`supabase/staging-baseline/20261008_admin_invite_membership_LOCAL_ONLY.sql` は、`authenticated` に `neighborhood_admins` の `id`、`neighborhood_id`、`admin_auth_id`、`status` のSELECTだけを付与し、RLSで「自分のAuth IDに紐づくactive行」だけを返す。`anon`、招待トークン列、クライアントのINSERT/UPDATE/DELETEは拒否のまま。`service_role` の既存権限は使う。このSQLにはローカル実行ガードがあり、実Projectにはそのまま適用できない。

検証用システム管理者は**メールアドレスではなくAuthユーザーID（UUID）で指定**する方針。検証用IDは別途確定し、サーバーで照合する。現在の `memberships` APIと一部UIには本番メール固定の判定が残り、baseline内の `is_el_town_system_admin` は常にfalse。このため、ID判定の実装と正・負のテストを終えるまで、検証用のシステム管理権限を有効にしない。

## ローカルテスト結果

PGlite 0.5.8のメモリ内DBにbaselineとSQL案を適用し、架空の町内会A・B、active役員A・B、pending候補者を使って確認した。

- ローカル実行ガードは、設定がない場合に適用を拒否した。
- 役員Aは自分のactive行だけ、役員Bは自分のactive行だけ読めた。pending候補者は自分の行も読めなかった。
- `authenticated` による招待トークン列のSELECTと表のINSERT/UPDATE、`anon` によるSELECTは拒否された。
- `service_role` は招待行を更新できた。Policyはこのテーブルに1件だけ。
- 招待受諾ロジックの既存テスト3件、baselineの静的拒否チェックも通過した。

再実行はリポジトリのルートで行う。PGliteはリポジトリ外の一時ディレクトリへ入れる。

```powershell
npm install --prefix "$env:TEMP\el-town-pglite-test" --no-save --ignore-scripts @electric-sql/pglite
node scripts/test-staging-admin-invite-access-pglite.mjs "$env:TEMP\el-town-pglite-test\node_modules\@electric-sql\pglite\dist\index.js"
```

## 検証Projectへ適用する前の残作業

1. 役員一覧、招待作成、再発行、退任、削除をサーバー経路へ移し、操作する役員の権限と対象町内会をサーバーで検証する。招待トークンは必要な相手にだけ返す。
2. 検証用システム管理者IDの判定を実装し、他のIDや同じメール文字列だけでは権限が得られないことをテストする。
3. 招待以外の管理画面で必要な表・関数・Storageの権限を別途設計する。現状の拒否初期状態では管理画面全体は動かない。
4. 実Supabaseに近いPostgreSQL環境で再検証し、検証Project Ref、費用、秘密情報の保管先と適用手順を照合する。本番へリンクされたCLIから無指定のDB変更コマンドを実行しない。
