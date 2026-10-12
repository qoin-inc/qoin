# システム管理ログイン設定

`/system` のログイン情報は、Netlifyの環境変数で設定します。

- `SYSTEM_LOGIN_ID`: ログインID
- `SYSTEM_LOGIN_PASSWORD`: パスワード
- `SYSTEM_SESSION_SECRET`: セッション署名用の十分に長いランダム文字列

検証用ブランチでは3つとも必須です。`SYSTEM_SESSION_SECRET` は32文字以上にしてください。未設定時の固定ログインID・パスワードは廃止し、Cookieも無効になります。ログインセッションはHttpOnly Cookieに8時間保存されます。

検証用 `/system` は、さらに `NEXT_PUBLIC_SUPABASE_URL`、`STAGING_SUPABASE_PROJECT_REF`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SECRET_KEY`、`STAGING_SYSTEM_ADMIN_AUTH_ID` を必要とします。URLとProject Refは `el-town-staging` の検証用Projectに一致させ、AuthユーザーIDはそのProjectに存在する専用ユーザーのUUIDを設定してください。IDが未設定か一致しない場合はセッションを発行しません。秘密キーやパスワードはGit・日報・チャットに記載しないでください。

構造baselineのDB側システム管理者関数は、現在も常にfalseです。この設定だけでは管理者DB操作は有効になりません。検証用DB権限を別途設計・検証してから接続してください。
