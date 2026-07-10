# el-town 機能チェックリスト

作成日: 2026-07-06  
対象: `C:\Users\info\.gemini\antgravity`  
参照元: `docs/system_architecture_by_feature.md`、主要ソースコード

## 判定凡例

- 実装済み: 主要な画面または処理がコード上で確認できる。
- 一部実装: 入口や表示はあるが、詳細処理、CRUD、外部連携、状態更新の不足がある。
- 不足: 想定されている処理または参照先が未実装。
- 要確認: 本番環境、Supabase設定、LINE/Stripe/Netlify設定、RLSなどコード外の確認が必要。

## 全体サマリー

| 領域 | 判定 | 要点 |
|---|---|---|
| 初期メニュー・入口 | 実装済み | `/` の初期メニュー、ロゴ、役員/会員/操作方法の導線、URLパラメータ遷移を確認。 |
| LIFF/Supabase共通 | 要確認 | LIFF初期化とSupabase認証処理はあるが、本番LIFF設定、環境変数、LINE内挙動の確認が必要。 |
| 役員ログイン・自治会登録 | 一部実装 | ログイン、新規登録、招待、パスワード再設定はある。招待承認フローに不整合あり。 |
| 管理ダッシュボード | 一部実装 | サマリー集計とモジュールカードはあるが、カード先の詳細CRUDは未接続。 |
| 会員ログイン・名簿連携 | 一部実装 | LINEログイン、名簿検索、招待コード登録はある。退会判定も一部あり。 |
| 会員向け回覧 | 一部実装 | 回覧一覧・詳細表示はある。既読更新や確認履歴保存は未実装。 |
| 会費・決済 | 不足 | 会員画面は準備中表示。Stripeオンボーディングはあるが会費決済フローは未実装。 |
| 地域ポータル投稿 | 一部実装 | 投稿作成・編集・削除・画像アップロードはある。地図はLeafletではなくプレースホルダー。 |
| Stripe Connect | 一部実装 | Expressアカウント作成とAccount Link発行はある。webhookのDB状態更新は未実装。 |
| 予算・決算 | 不足 | 入力フォームはあるが `/api/budget` が存在しない。保存先・一覧・CSV出力も未確認。 |
| 印刷ページ | 実装済み | 委任状・領収書の印刷ページを確認。 |
| マニュアル・リッチメニュー | 実装済み | `/manual/*` と `/richmenu` は静的画面として確認。 |
| システム管理 | 不足 | `/system` はプレースホルダーのみ。 |

## 機能別チェック

### 1. 初期メニュー・入口

| 項目 | 判定 | 確認ファイル | メモ |
|---|---|---|---|
| 初期メニュー表示 | 実装済み | `app/page.tsx` | ロゴ、3メニュー、スマホ前提の画面を確認。 |
| メニュー順 | 実装済み | `app/page.tsx` | 役員の方、会員の方、操作方法の順。 |
| `redirect` / `goto` / `open` パラメータ | 実装済み | `app/page.tsx`, `components/InitialRedirectHandler.tsx` | admin/resident/portal/個別回覧への振り分けあり。 |
| `liff.state` 解析 | 実装済み | `app/page.tsx` | `decodeURIComponent` 後にURLSearchParamsで解析。 |
| LIFFプロフィールによる自動会員判定 | 一部実装 | `components/InitialRedirectHandler.tsx` | `resident_rosters` を照会。LIFF初期化完了とプロフィール取得タイミングは本番確認が必要。 |

### 2. LIFF/Supabase共通

| 項目 | 判定 | 確認ファイル | メモ |
|---|---|---|---|
| LIFF SDK初期化 | 一部実装 | `components/LiffProvider.tsx` | `NEXT_PUBLIC_LIFF_ID` で初期化。失敗時もUIは表示する設計。 |
| LIFFプロフィール取得 | 一部実装 | `components/LiffProvider.tsx`, `app/resident/page.tsx` | `getProfile()` を利用。LINEアプリ内・通常ブラウザ両方の実機確認が必要。 |
| Supabaseクライアント | 要確認 | `lib/supabaseClient.ts` | 環境変数が無い場合はplaceholderへフォールバック。本番Netlify設定が必須。 |
| Netlify設定 | 要確認 | `netlify.toml` | `NEXT_PUBLIC_LIFF_ID` は設定あり。Supabase/Stripe/Base URLはNetlify側設定確認が必要。 |

### 3. 役員・管理者機能

| 項目 | 判定 | 確認ファイル | メモ |
|---|---|---|---|
| 役員ログイン | 実装済み | `app/admin/page.tsx` | Supabase Auth + `neighborhood_admins` 照会。 |
| 町内会・自治会新規登録 | 実装済み | `components/SignupTown.tsx` | `neighborhoods` と代表者 `neighborhood_admins` を登録。 |
| 既存データ自己修復 | 一部実装 | `app/admin/page.tsx` | 旧 `neighborhoods.admin_auth_id` から `neighborhood_admins` へ移行する処理あり。 |
| 招待された役員の合流 | 要確認 | `app/admin/page.tsx` | `join` は `pending` を `active` に更新後、承認待ちメッセージを出す。`invite` は `waiting_approval` 挿入後にダッシュボードへ進めるため、承認フローの再設計が必要。 |
| パスワード再設定 | 実装済み | `app/admin/page.tsx` | reset/update の画面とSupabase Auth処理あり。 |
| 管理ダッシュボード概要 | 実装済み | `components/AdminView.tsx` | 会員数、回覧数、未納数、入金額の集計あり。 |
| 管理モジュール詳細 | 不足 | `components/AdminView.tsx` | 会員管理、回覧、会費、予算、イベント、設定カードは表示のみで遷移・CRUDなし。 |
| 役員承認・権限管理 | 不足 | `components/AdminView.tsx`, `app/admin/page.tsx` | 承認待ち状態の概念はあるが、代表者が承認/却下するUIが未確認。 |

### 4. 会員・住民機能

| 項目 | 判定 | 確認ファイル | メモ |
|---|---|---|---|
| LINEログイン | 一部実装 | `app/resident/page.tsx` | LIFFログイン後、疑似メールでSupabase Authログイン/登録。 |
| 会員名簿検索 | 実装済み | `app/resident/page.tsx` | `resident_rosters` の本人・家族IDを検索。 |
| 退会済みブロック | 一部実装 | `app/resident/page.tsx`, `app/portal/page.tsx` | `withdrawal_status === withdrawn` を確認。対象画面全体での一貫性は要確認。 |
| 名簿照合による会員連携 | 実装済み | `components/SignupResident.tsx` | 町内会名、郵便番号、住所２、必要に応じて住所３、お名前で既存名簿を照合しLINEアカウントを連携。招待コードは役員招待で使用。 |
| 会員ホーム | 実装済み | `components/ResidentView.tsx` | 未読数、新着回覧、下部タブを表示。 |
| 回覧一覧・詳細 | 一部実装 | `components/ResidentView.tsx` | `circulars` 一覧・詳細は表示。確認ボタンは状態更新なし。 |
| 既読管理 | 不足 | `components/ResidentView.tsx` | `is_read` を表示計算に使うが、既読更新先や履歴テーブルは未確認。 |
| 会費タブ | 不足 | `components/ResidentView.tsx` | 「準備中」表示のみ。 |
| プロフィール/設定 | 一部実装 | `components/ResidentView.tsx` | 連携済み表示とトップ戻りのみ。編集や退会手続きは未確認。 |

### 5. 地域ポータル

| 項目 | 判定 | 確認ファイル | メモ |
|---|---|---|---|
| 会員セッション確認 | 実装済み | `app/portal/page.tsx` | 未ログイン時は `/resident` へ誘導。LIFF復元処理あり。 |
| 投稿一覧 | 実装済み | `app/portal/page.tsx` | `public_posts` を取得し `food` / `sight` で表示。 |
| 投稿作成 | 実装済み | `app/portal/page.tsx` | `public_posts.insert` を確認。 |
| 投稿編集・削除 | 実装済み | `app/portal/page.tsx` | 投稿者本人のみ編集/削除ボタン表示。RLS設定は要確認。 |
| 画像アップロード | 一部実装 | `app/portal/page.tsx` | Supabase Storage `attachments` へupload。bucket/RLS/公開設定は要確認。 |
| 住所から緯度経度補完 | 一部実装 | `app/portal/page.tsx` | Nominatimを直接fetch。利用ポリシー、User-Agent、失敗時挙動は要確認。 |
| 地図表示 | 不足 | `components/MapComponent.tsx` | Leafletではなく、地域リストのプレースホルダー表示。 |

### 6. Stripe・会費

| 項目 | 判定 | 確認ファイル | メモ |
|---|---|---|---|
| Stripe Expressアカウント作成 | 実装済み | `app/api/admin/stripe/create-account-link/route.ts` | `neighborhoods.stripe_account_id` に保存。 |
| Stripe Account Link発行 | 実装済み | `app/api/admin/stripe/create-account-link/route.ts` | refresh/return URLを生成。 |
| Stripe return/refresh画面 | 実装済み | `app/admin/stripe/return/page.tsx`, `app/admin/stripe/refresh/page.tsx` | 完了/中断画面あり。 |
| webhook署名検証 | 一部実装 | `app/api/webhooks/stripe/route.ts` | secretがある場合は検証。無い場合はJSON parse。 |
| webhook DB更新 | 不足 | `app/api/webhooks/stripe/route.ts` | `account.updated` のDBステータス更新がコメントのみ。 |
| 会員向けオンライン支払い | 不足 | `components/ResidentView.tsx` | 支払い画面・Checkout/PaymentIntent/記録更新は未確認。 |
| 会費レコード管理 | 一部実装 | `components/AdminView.tsx` | 集計はあるが、請求作成、入金登録、決済照合UIは未実装。 |

### 7. 予算・決算

| 項目 | 判定 | 確認ファイル | メモ |
|---|---|---|---|
| 予算入力フォーム | 一部実装 | `components/BudgetForm.tsx` | タイトル、年度、明細入力あり。 |
| 予算作成ページ | 一部実装 | `pages/admin/budget.tsx` | `/api/budget` にPOSTするが、APIが存在しない。 |
| 保存API | 不足 | `app/api/*`, `pages/api/*` | `/api/budget` 未確認。 |
| 一覧・編集・CSV出力 | 不足 | - | 構成図上の想定に対する実装未確認。 |

### 8. 印刷・帳票

| 項目 | 判定 | 確認ファイル | メモ |
|---|---|---|---|
| 委任状印刷 | 実装済み | `app/resident/proxy/page.tsx` | クエリパラメータから本文・日付・本人・代理人を表示し印刷。 |
| 領収書印刷 | 実装済み | `app/resident/receipt/page.tsx` | 金額、宛名、日付、自治会名、決済番号、支払方法を表示し印刷。 |

### 9. マニュアル・リッチメニュー・システム

| 項目 | 判定 | 確認ファイル | メモ |
|---|---|---|---|
| マニュアルハブ | 実装済み | `app/manual/page.tsx` | 各マニュアルへの導線あり。 |
| 管理者マニュアル | 実装済み | `app/manual/admin/page.tsx` | 静的/操作説明画面として確認。 |
| 会員マニュアル | 実装済み | `app/manual/member/page.tsx` | ステップ表示あり。 |
| ライブ/Stripeマニュアル | 実装済み | `app/manual/live/page.tsx`, `app/manual/stripe/page.tsx` | 複数ステップの案内あり。 |
| リッチメニュー画像ページ | 実装済み | `app/richmenu/page.tsx` | スクリーンショット用途の3列レイアウト。 |
| システム管理 | 不足 | `app/system/page.tsx`, `components/SystemAdminView.tsx` | プレースホルダーのみ。 |

## 優先度付き残課題

| 優先度 | 課題 | 理由 |
|---|---|---|
| P0 | 役員招待・承認フローの不整合を修正 | `waiting_approval` のままダッシュボードへ進める経路があり、権限管理上のリスクが高い。 |
| P0 | `/api/budget` 未実装の解消、または予算画面の導線停止 | 画面から存在しないAPIを呼ぶため、ユーザー操作で必ず失敗する。 |
| P1 | 管理ダッシュボード各カードの詳細画面/CRUDを実装 | 会員管理、回覧作成、会費管理が現状は概要表示中心。 |
| P1 | 会員向け会費支払いフローを実装 | 会費タブが準備中で、Stripe連携と会員支払いがつながっていない。 |
| P1 | Stripe webhookでDBステータス更新 | オンボーディング完了状態がDBに反映されない。 |
| P1 | 回覧の既読/確認状態を保存 | 「確認しました」ボタンが表示のみで、既読管理の実体がない。 |
| P2 | 地図をLeaflet実装に戻す | 構成図のLeaflet前提と現コードがずれている。 |
| P2 | Supabase RLS/Storage bucket/Netlify環境変数の本番確認 | コード外設定に依存する箇所が多い。 |
| P2 | `/system` を正式機能にするか非公開にする | プレースホルダー公開状態を避ける。 |

## 検証メモ

- `.\node_modules\.bin\tsc.cmd --noEmit --incremental false` は成功。
- 通常の `tsc --noEmit` は `tsconfig.tsbuildinfo` を作成しようとして、作業フォルダの書き込み権限により失敗したため、`--incremental false` で確認した。
- ローカルサーバー起動、本番URL確認、Supabase/LINE/Stripeの実環境動作確認はこのチェックリスト作成時点では未実施。
