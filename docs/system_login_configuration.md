# システム管理ログイン設定

`/system` のログイン情報は、Netlifyの環境変数で設定します。

- `SYSTEM_LOGIN_ID`: ログインID
- `SYSTEM_LOGIN_PASSWORD`: パスワード
- `SYSTEM_SESSION_SECRET`: セッション署名用の十分に長いランダム文字列

環境変数が未設定の場合の初期値は以下です。

- ログインID: `admin`
- パスワード: `eltown-admin`

本番運用では3つの環境変数を設定し、再デプロイしてください。ログインセッションはHttpOnly Cookieに8時間保存されます。
