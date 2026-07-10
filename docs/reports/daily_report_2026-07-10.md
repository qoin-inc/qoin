# 作業レポート 2026-07-10

## 対象

- プロジェクト: el-town
- 正式作業フォルダ: `C:\Users\info\.gemini\antgravity`
- 本番URL: `https://el-town.jp`
- ホスティング: Netlify
- 主な構成: Next.js / Supabase / LINE LIFF / LINE Messaging API / Netlify
- 本日の作業方針: スマホ会員画面の復元、LINE連携、LINEプッシュ通知、発信画像表示、docs整理まで実施。

## 本日の主な作業

### 1. スマホ会員画面の復元・整理

- LINEリッチメニューの「会員の方」から開いた会員画面を、以下の主タブ構成に整理しました。
  - 回覧板
  - 会費
  - Live
  - 設定
- 回覧板配下は、以下の切替に整理しました。
  - 全て
  - 電子回覧板
  - 連絡
  - イベント
- Live配下は、以下の切替に整理しました。
  - Live
  - 施設予約
- 主タブとサブタブは同じ下部位置で切り替えるようにし、画面スペースを広く使えるようにしました。
- タブボタンを高齢者でも押しやすいサイズにし、選択中のボタンが分かるように色と立体感を調整しました。
- 会員画面上部の町内会名、氏名、ロゴヘッダーを削除し、一覧領域を広くしました。
- イベントとLiveの「カレンダー / 一覧」切替は、画面下部の浮動切替に移動しました。

### 2. LINEログイン・会員連携

- `ERR_TOO_MANY_REDIRECTS` が出ていた会員画面のリダイレクトループを修正しました。
- 既に接続済みの会員は、初期メニューや再照合を挟まず会員画面へ遷移できるようにしました。
- 新規会員の照合条件を以下に整理しました。
  - 町内会名
  - 郵便番号
  - 住所2
  - 住所3があれば住所3
  - 名前
- 東京町内会の招待コードは、会員照合ではなく管理機能を使う役員向けの導線として整理しました。
- 会員画面 `/resident` でもLIFFを初期化し、既存接続済み会員でもLINEユーザーIDを名簿へ同期できるようにしました。

### 3. LINEプッシュ通知

- 管理機能の発信からLINEトーク画面へプッシュ通知できるように修正しました。
- Supabase Auth IDをLINE送信先に使っていた問題を修正し、Messaging API用のLINEユーザーIDを使うようにしました。
- LINE送信用ID保存のため、以下SQLを追加しました。
  - `docs/sql/line_push_user_id_columns_2026-07-10.sql`
- Netlify環境変数 `LINE_CHANNEL_ACCESS_TOKEN` を本番に反映し、再デプロイしました。
- LINE送信APIの診断ログを追加しました。
- 実DBに存在しない `status` カラムを送信APIが参照していた問題を修正しました。
- 保存済みLINEユーザーIDの先頭が小文字 `u` の場合、送信時に大文字 `U` に正規化するようにしました。
- プッシュ通知が実際にLINEトーク画面へ届くことを確認しました。

### 4. LINEトーク画面の表示改善

- LINEプッシュ通知をテキストURL表示からFlexメッセージ形式に変更しました。
- リンクはURL直書きではなく、`詳細はこちら` ボタンにしました。
- 画像付き発信では、LINEトーク画面にも画像を表示するようにしました。
- 画像の表示順を以下に変更しました。
  - 表題
  - 内容
  - 画像
  - 詳細はこちら
- 縦長スクリーンショット画像が中央切り抜きで白抜けに見えていたため、切り抜かず全体が見える `fit / contain` 表示に変更しました。

### 5. スマホ回覧板カードの画像表示

- 発信機能で添付した画像を、会員スマホ画面のカードにも表示するようにしました。
- カード内の表示順を以下に変更しました。
  - 表題
  - 内容
  - 画像
  - 詳細を確認する
- 縦長画像でも白抜けに見えないよう、上寄せで全体が見える表示にしました。

### 6. 管理画面・発信機能

- 発信機能のLINE送信結果を管理画面に表示するようにしました。
- LINE送信用IDカラム未設定、送信先ID未登録、LINE API HTTPエラーなどの理由が分かるようにしました。
- SQLファイル移動に合わせて、管理画面上の案内パスを `docs/sql/...` に更新しました。

### 7. docs整理

- `docs` 直下に混在していたファイルを用途別に整理しました。
- 新しい構成は以下です。
  - `docs/reports/`
  - `docs/sql/`
  - `docs/architecture/`
  - `docs/admin/`
  - `docs/integrations/`
- `docs/README.md` を追加し、資料の入口を作りました。
- 旧日報は `docs/reports/` に移動しました。
- SQLファイルは `docs/sql/` に移動しました。
- 設計資料は `docs/architecture/` に移動しました。
- 管理画面設計資料は `docs/admin/` に移動しました。
- Stripe連携方針は `docs/integrations/` に移動しました。

## 追加・更新した主なファイル

- `components/ResidentView.tsx`
- `components/AdminView.tsx`
- `components/LiffProvider.tsx`
- `components/InitialRedirectHandler.tsx`
- `components/SignupResident.tsx`
- `app/resident/page.tsx`
- `app/api/admin/publish-line/route.ts`
- `styles/design.css`
- `docs/README.md`
- `docs/reports/daily_report_2026-07-10.md`
- `docs/sql/line_push_user_id_columns_2026-07-10.sql`

## 主なコミット

- `0e0496d` Move resident sub tabs to bottom
- `fdb6884` Unify resident bottom tab bar
- `ffedcf8` Enlarge resident bottom tabs
- `bd887c3` Improve resident tab visibility
- `4e8bcfd` Move resident view toggles into screen
- `7538d1b` Fix LINE push target IDs
- `6e6b534` Add LINE push diagnostics
- `5de775a` Sync resident LINE user IDs from LIFF
- `6aa830d` Fix LINE push roster query
- `3c40937` Refine resident header and LINE push card
- `d42b81c` Fix LINE push target casing and card images
- `eb08d35` Show circular images after text without cropping

## 本番デプロイ

本日は複数回の本番デプロイを実施しました。最終デプロイは以下です。

- 最終デプロイID: `6a50de5ae506720b87c29fae`
- 主要アプリ修正の最終コミット: `eb08d35`
- docs整理とSQL案内パス更新は、本レポート作成時のコミットに含めます。
- 本番URL: `https://el-town.jp`

確認済みURL:

- `https://el-town.jp/resident?v=3` 200 OK
- `https://el-town.jp/admin` 200 OK

## 動作確認

- `npm run build`
  - 成功
  - Next.jsの本番ビルド、Lint、型チェック、静的ページ生成まで成功
- `curl.exe -I -L https://el-town.jp/resident?v=3`
  - 200 OK
- `curl.exe -I -L https://el-town.jp/admin`
  - 200 OK
- LINEトーク画面へのプッシュ通知
  - 送信成功を確認
- 単独のTypeScript確認
  - 終盤に `.\node_modules\.bin\tsc.cmd --noEmit --incremental false` がタイムアウト
  - ただし `npm run build` 内の型チェックは成功

## 注意点

- LINEチャネルアクセストークンは秘匿情報のため、チャットやドキュメントに残さず、Netlify環境変数で管理します。
- 旧日報内には当時のファイル配置として `docs/*.sql` の記述が残っています。現在のSQL配置は `docs/sql/` です。
- LINEトーク画面の画像表示は、次回実機で再確認してください。

## 次回やること

- LINEトーク画面で、画像付きFlexメッセージが `表題 → 内容 → 画像 → 詳細はこちら` の順に表示されることを実機で確認する。
- スマホ会員画面で、回覧板カードの画像が白抜けせず表示されることを確認する。
- 画像添付がPDF、Excel、Wordの場合のスマホ表示とLINE通知の扱いを整理する。
- docs整理後の新しいパスで、管理画面のSQL案内が分かりやすいか確認する。
- 旧日報内のパス表記を必要に応じて追補または注記する。
