# 検証用システム管理者IDの準備（2026-10-13）

対象は `staging-invite-server` ブランチと `el-town-staging`。本番DB・本番サイトは変更していない。

## 実装した範囲

- 招待APIの接続先をProject Ref `zghcorbdtslrjtkkspfe` に固定し、環境変数同士を誤って本番Projectへ合わせても拒否する。
- `/system` のSupabaseセッションは、検証Projectの `STAGING_SYSTEM_ADMIN_AUTH_ID` で指定したAuthユーザーを取得し、発行後のセッションIDも同じUUIDと照合する。固定メールの指定は使わない。
- `/system` の固定ログインID・パスワードと推測可能なCookie秘密値へのフォールバックを廃止。3つの認証設定が欠ける場合、ログインとCookie認証を拒否する。
- 招待画面でのシステム管理者行の判定と、招待APIによる保護をID方式へ変更。招待APIは管理者IDの実在確認ができなければ利用できない。
- DB側の2つのシステム管理者判定関数をID照合へ変える検証専用SQLを作成。専用表は最初は空で、権限を持つ利用者はいない。これは**実検証Projectへまだ適用していない**。

## ローカル確認

- PGliteの使い捨てDBで、SQLの適用ガード、空の許可表、ID一致時のtrue、別IDのfalse、匿名の関数実行拒否、表の直接参照拒否を確認した。
- 認証設定がない場合のログイン・Cookie拒否と検証Project固定を単体テストで確認した。TypeScript型チェック、Next.jsビルドも通過した。
- 実SupabaseへのSQL適用、検証用Authユーザーの作成、サーバー秘密キーの設定、Netlifyデプロイ、実ログイン試験は行っていない。

## 次の条件

1. `el-town-staging` のAuthenticationに専用ユーザーを作成し、そのAuthユーザーIDを同じProjectの管理画面で確認する。既存の本番ユーザーIDは使わない。
2. `docs/admin/staging-system-admin-identity-apply.md` に従い、Project IDと事前状態を再確認してから検証専用SQLを適用する。事後確認で許可表が空・クライアントから参照不可であることを確認する。
3. 専用ユーザーIDの登録と検証用サーバー環境変数の設定は別途行う。秘密キーやパスワードをGit、日報、チャットに載せない。
4. 管理画面のほかのGRANT/RLSとStorage Policyを整え、架空データで実Projectとの結合試験を行う。検証用Netlifyのデプロイは承認付き手順に従う。
