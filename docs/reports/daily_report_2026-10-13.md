# 日報 2026-10-13

対象：el-town。日本時間。検証環境の作業と本番環境への影響を分けて記録する。

## 本日の実績

### 検証用システム管理者IDの準備

- `staging-invite-server` ブランチで、招待APIのSupabase接続先を検証Project `zghcorbdtslrjtkkspfe` に固定した。`/system` のセッション発行は固定メールではなく、設定したAuthユーザーIDと発行後のユーザーIDが一致する場合に限るようにした。
- 固定ログインID・パスワードと推測可能なCookie秘密値へのフォールバックを廃止。管理者IDや必要な環境変数が欠ける場合は利用できない。役員一覧のシステム管理者行もメール文字列ではなくIDで判定する。
- DB側の管理者判定をID方式にする検証専用SQL、読み取り専用の事後確認SQL、適用手順を作成した。最初は許可対象が空で、SQLだけでは管理者権限を付与しない。
- 単体テスト、TypeScript型チェック、Next.jsビルド、使い捨てPGliteでのDB権限テストを通過した。実装と手順はGitHubの `staging-invite-server` ブランチへ送信し、リモート先端との一致を確認した。

### 検証用Supabaseの確認と残るアクセスの棚卸し

- Supabase管理画面で `el-town-staging` の接続先を確認した。AuthenticationのUsers画面は当初0人だった。
- 利用者から、本番とは別のUIDを持つ検証用Authユーザーを登録したと報告があった。作成後のUsers一覧とUIDの照合はまだ行っていない。パスワードや秘密キーは受け取っていない。
- 管理画面・町内会登録・システム管理画面・添付ファイルのアクセス経路を調査した。役員招待以外は、ブラウザから直接DBやStorageへアクセスする箇所が多く、追加の権限設計が必要。
- 管理者ID照合用SQLをクリップボードへコピーしたが、**実検証ProjectでのSQL実行結果はまだ受け取っていない**。実Supabaseへの適用済みとは扱わない。

### 本番への影響

- 本番Supabase、本番Netlify、LINE、Stripeには操作していない。検証用Netlifyへのデプロイも行っていない。
- 新しく作成されたと報告されたAuthユーザーは検証用Project内。DBの管理者許可表へのUID登録と検証サイトへの接続は未実施。

## 次回やること

1. `el-town-staging` のUsers一覧で新規ユーザーのUIDを確認し、Project ID `zghcorbdtslrjtkkspfe` を再照合する。UIDは本番のものを使わない。
2. 検証専用SQL `20261013_system_admin_identity_STAGING.sql` を対象Projectで一度だけ実行し、`postflight_system_admin_identity_readonly.sql` で空の許可表・RLS・権限拒否を確認する。エラー時は再実行しない。
3. UIDを許可表へ登録する手順を事前に検証し、検証用サーバー環境変数を安全な保管先に設定する。秘密キー・パスワードをGit、日報、チャットに記載しない。
4. 架空データで役員招待APIと実Supabaseの結合試験を行う。管理画面全体・Storageの権限整備とNetlifyデプロイは、その後に別途進める。
