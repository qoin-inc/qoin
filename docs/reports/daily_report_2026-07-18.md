# 作業レポート 2026-07-18

## 対象

- プロジェクト: el-town
- ブランチ: `deploy-ui-restore`
- 本番URL: `https://el-town.jp`

## 総会案内の発信エラー対応

- 管理画面の総会案内で、保存・LINEプッシュ発信時に「発信種別のDB制約を更新してください」と表示される問題を調査しました。
- 本番Supabaseの `circulars_category_check` を確認し、`assembly` はすでに許可されていることを確認しました。
- 本番DBへ総会案内と同じ全項目を使ったINSERTをトランザクション内で実施し、成功後にロールバックしました。本番データは残していません。
- `circulars` の現在のRLSでは認証済みユーザー向けの変更許可があり、システム管理者IDが町内会役員IDと一致しないことが直接原因である可能性は低いと判断しました。ただし、ログインセッションが未認証の場合は権限エラーになる可能性があります。
- 従来は、RLS、添付保存、必須項目、外部キーなどの別エラーも、メッセージに `violates` が含まれるだけで発信種別制約エラーへ変換していました。
- 添付保存、役員権限、必須項目、関連データ、スキーマ未反映、実際の発信種別CHECK制約を区別して表示するよう修正しました。
- 診断用にエラー発生段階・コード・メッセージをブラウザコンソールへ記録するようにしました。発信内容や秘密値は記録しません。

## 検証

- `npx tsc --noEmit`: 成功
- `npm run build`: 成功
- Next.jsのコンパイル、Lint、型チェック、静的ページ生成: 成功
- Google Fontsのビルド時取得警告は発生しましたが、ビルドは正常終了しました。

## GitHub・本番反映

- 修正コミット: `1dd1214`（Clarify admin publish errors）
- GitHubの `deploy-ui-restore` ブランチへpushしました。
- Netlify本番デプロイID: `6a5ab11d74309ea6d861b61f`
- デプロイ対象コミット: `1dd121477f5e00e1e655fe1c4f1ed55f0d1f4a41`
- 計画時ビルドID: `1ZQDmHj-nW-4uz4MiFH7-`
- 本番ビルドID: `IiwphIpF5bJ7ZCpjfLsD7`
- 公開URL疎通、コミット不変、ビルドID一致、デプロイID取得を確認し、本番デプロイは検証済みです。

## スマホのイベントカレンダーから詳細画面を開けない問題

- スマホの7列カレンダーでは、イベント名ボタンのタップ領域が約20pxと小さく、詳細画面を開きにくい状態でした。
- イベントが1件の日は、日付とイベント名を含む日付枠内のほぼ全体を1つのボタンにし、タップするとイベント詳細画面を開くように変更しました。
- 同日に複数イベントがある場合も、各イベントボタンの最小高さを32pxへ拡大し、タッチ操作を安定させました。
- 詳細を開くボタンへ読み上げ用ラベルとフォーカス表示を追加しました。
- `npx.cmd tsc --noEmit --incremental false` と `npm.cmd run build` に成功しました。
- 修正コミット `6dae567` をGitHubの `deploy-ui-restore` ブランチへpushし、Netlify本番へ反映しました。
- Netlify本番デプロイID: `6a5ac936569046d82c3f990b`
- デプロイ対象コミット: `6dae56783a3ec32ed90d94018110d940f821b048`
- 計画時ビルドID: `7vPgZjITDntSwAE8CleBT`
- 本番ビルドID: `edpcCOnfuQSKs5IGiiyI9`
- 公開URL `https://el-town.jp` の疎通、コミット不変、ビルドID一致、デプロイID取得を確認し、本番デプロイは検証済みです。

## Live参加申込の会員ID型不一致エラー対応

- スマホのLive参加申込で、UUID形式の会員IDに対して `invalid input syntax for type bigint` が表示され、申込できない問題を調査しました。
- 本番DBでは `resident_rosters.id` がUUIDである一方、後付けの `live_session_applications.roster_id` がBIGINTであり、アプリがUUIDをBIGINT列へ送信していたことを確認しました。
- Live会議IDは `live_sessions.id` と申込側の参照列がともにBIGINTで一致しており、会員IDだけが不一致でした。
- 既存申込と互換性を保つため旧 `roster_id` は削除・変換せず、新たにUUID型の `resident_roster_id` と外部キーを追加する非破壊移行にしました。
- `docs/sql/live_session_application_id_type_fix_2026-07-18.sql` を作成して本番Supabaseへ適用し、ログイン中の利用者から町内会と会員をサーバー側で照合する `create_live_session_application` RPCを追加しました。
- RPCをトランザクション内で実行し、BIGINT会議ID・UUID会員IDで申込行を正常作成できることを確認後、ロールバックしました。検証行が残っていないことも確認済みです。
- 会員画面はRPCを優先して申込し、DB反映直後などRPCが未認識の場合のみUUID型の `resident_roster_id` を使う互換フォールバックを行うよう修正しました。
- 将来の環境構築でも同じ型不一致が再発しないよう、既存のLive・施設用SQLにもUUID会員参照列を追加しました。
- `npx.cmd tsc --noEmit --incremental false` と `npm.cmd run build` に成功しました。
- 運用手順として、修正コミットをGitHubへpushした後に、承認付きNetlify本番デプロイを必ず実施します。デプロイ完了後、デプロイID・対象コミット・ビルドID・公開URL検証結果をこの履歴へ追記します。

## 総合ビューの種類フィルター・表題検索

- 管理機能の総合ビューへ「すべて」「電子回覧板」「連絡」「イベント」「総会」「Live」「施設予約」の種類フィルターを追加しました。
- 種類はボタンで1つ選択でき、選択中の種類を明示するようにしました。
- 表題の一部を入力して絞り込める検索欄を追加しました。日本語を含む部分一致で検索します。
- 種類フィルターと表題検索は同時に適用されます。
- 絞り込み後の表示件数と総件数を表示し、一致する項目がない場合は専用メッセージを表示します。
- スマートフォンではフィルター、検索、件数を縦並びにして操作しやすくしました。
- Next.js本番ビルド、Lint、型チェック、静的ページ生成、単独TypeScript型チェック、Git差分チェックに成功しました。
- 総合ビューのフィルター・表題検索コミット `e6453a8` をGitHubへpushし、本番Netlifyへ反映しました。
- 本番デプロイID: `6a5ac47c569046cb523f9896`
- デプロイ対象コミット: `e6453a80c1dc011572ab15736d71b9edae48fbc3`
- 計画時ビルドID: `GaNSXJI5jol-hqrvUe96v`
- 本番ビルドID: `cgLa89O_IuEj8MhQhkVsO`
- 公開URL疎通、コミット不変、ビルドID一致、デプロイID取得を確認し、本番デプロイは検証済みです。

## 総会案内・イベント返信数の管理ビュー集計

- 管理機能の発信済みカードに、返信数を数値で確認できる集計欄を追加しました。
- 総会案内は「出席者」「欠席者」「委任状」「返信総数」を表示します。
- イベントは「大人」「子供」「総人数」を表示します。
- 返信が0件の場合も各項目を0として表示します。
- 委任状PDF・画像だけでなく、委任状本文、署名者、署名日が保存されている返信も委任状数へ含めます。
- 発信直後や編集後に作成されるカードにも同じ集計表示を適用しました。
- TypeScript型チェック、Git差分チェック、Next.js本番ビルド、Lint、静的ページ生成に成功しました。
- 返信集計ビューの修正コミット `ad0b018` をGitHubへpushし、本番Netlifyへ反映しました。
- 本番デプロイID: `6a5abbca77b97ffc9744172d`
- デプロイ対象コミット: `ad0b0184c1acb8550c0c1892060f97a878e18080`
- 計画時ビルドID: `NKWMVoE4Or7pGYXAwhRx2`
- 本番ビルドID: `NYupxPn0wzOVDa3RWqaEG`
- 公開URL疎通、コミット不変、ビルドID一致、デプロイID取得を確認し、本番デプロイは検証済みです。
- 承認付きデプロイ履歴は `.deploy/deployments.jsonl` にも `verified` として記録されています。

## Live参加申込の重複防止

- 同じ会員が同じLiveへ再申込するたびに新しい行が追加され、管理画面の参加者が重複する問題を確認しました。
- 本番DBでは2行が同じ「Live会議ID＋会員ID」の1組に重複していたため、更新日時が新しい申込を残して1行へ整理しました。
- `docs/sql/live_session_application_unique_fix_2026-07-18.sql` を作成して本番Supabaseへ適用し、「Live会議ID＋会員ID」の部分一意インデックスを追加しました。
- `create_live_session_application` RPCをUPSERTへ変更し、初回申込は新規保存、同じ会員の再申込は参加人数・氏名・申込日時を既存の1行へ更新するようにしました。
- 会員画面からの直接INSERTフォールバックを廃止し、RPCを通らない経路から重複が再発しないようにしました。
- 同一会員で同じLiveへ参加人数2名、続けて3名の申込をトランザクション内で実行し、行数1件・最新人数3名になることを確認後、ロールバックしました。
- ロールバック後の本番データは申込1件、検証行0件、重複0件であることを確認しました。
- `npx.cmd tsc --noEmit --incremental false` と `npm.cmd run build` に成功しました。
- この修正もGitHubへpush後、承認付きNetlify本番デプロイを必ず実施し、結果を履歴へ追記します。

## 次の確認

- 管理画面へ再ログインし、総会案内を再発信します。
- 再度失敗した場合は、新しく表示される原因別メッセージとエラーコードを確認します。
- 保存成功後、LINE送信件数と失敗件数、会員画面の総会案内表示を確認します。

## system管理者の全団体役員アクセス

- system管理者のSupabase Authユーザー `admin@el-town.jp` が存在することを確認しました。
- 対応前は、既存2団体のどちらにもsystem管理者の認証UUIDが `neighborhood_admins` へ登録されていませんでした。
- `docs/sql/system_admin_neighborhood_access_2026-07-18.sql` を作成し、トランザクション内のロールバック検証後に本番Supabaseへ適用しました。
- 既存2団体すべてへsystem管理者を `active` の役員として重複なく登録しました。
- 今後新規作成される町内会・自治会にも、作成直後にsystem管理者を自動登録するDBトリガーを追加しました。
- 適用後、町内会・自治会2件に対してsystem管理者の有効役員登録が2件あり、自動登録トリガーが有効であることを確認しました。
- `/system` の専用Cookie認証だけではSupabaseの `auth.uid()` が設定されないため、systemログイン成功時に `admin@el-town.jp` のSupabaseセッションをサーバー側で安全に発行し、ブラウザのSupabaseクライアントへ設定するよう修正しました。
- system管理者のパスワードはブラウザへ追加保存せず、既存のsystem認証Cookieとサーバー専用Supabase秘密キーを使用します。
- 修正後のNext.js本番ビルド、Lint、型チェック、静的ページ生成に成功しました。
- system管理者アクセスのアプリ修正コミット `f8bb5d9` をGitHubへpushし、本番Netlifyへ反映しました。
- 本番デプロイID: `6a5ab7124d5001d2464f56bc`
- デプロイ対象コミット: `f8bb5d9570b04c830cb4f8e0f1ec36346a783ee1`
- 計画時ビルドID: `OzYox6XRDhi27WYDzPYod`
- 本番ビルドID: `vHyI2a1_SOoMVc69rp6ln`
- 公開URL疎通、コミット不変、ビルドID一致、デプロイID取得を確認し、本番デプロイは検証済みです。

## 施設予約のID型不一致エラー対応

- スマホの施設予約で `column "facility_id" is of type uuid but expression is of type bigint` が表示される問題を調査しました。
- 本番DBでは、現行の `facilities.id` がBIGINTである一方、既存の `facility_reservations.facility_id` は旧UUID型のままであることを確認しました。
- 会員名簿も `resident_rosters.id` がUUIDである一方、後付けの `facility_reservations.roster_id` はBIGINTであり、予約RPCに2か所の型不一致がありました。
- 既存予約を削除・変換せず保持するため、`facility_bigint_id` を追加し、会員参照には既存の正しいUUID列 `resident_roster_id` を使用する非破壊移行を作成しました。
- `docs/sql/facility_reservation_id_type_fix_2026-07-18.sql` を本番Supabaseへ適用し、現行施設ID列がBIGINT、旧施設ID列がUUIDのまま保持、予約RPCが有効であることを確認しました。
- 予約RPCをトランザクション内で実行し、BIGINT施設ID・UUID会員IDで予約行を正常作成できることを確認後、ロールバックしました。検証行が残っていないことも確認済みです。
- 会員画面と管理画面は `facility_bigint_id` を優先して施設を照合し、旧予約は従来の `facility_id` へフォールバックするよう修正しました。
- `npx.cmd tsc --noEmit --incremental false` と `npm.cmd run build` に成功しました。
- 修正コミット `6e8ba24` をGitHubの `deploy-ui-restore` ブランチへpushし、Netlify本番へ反映しました。
- Netlify本番デプロイID: `6a5acfd5ea4c7f4170e1a780`
- デプロイ対象コミット: `6e8ba24699a95caf3786b6df597a09c531359533`
- 計画時ビルドID: `4wfhd-CkHL10HhPw74UtN`
- 本番ビルドID: `2NnpvGA4xaR2gpKLEk5tl`
- 公開URL `https://el-town.jp` の疎通、コミット不変、ビルドID一致、デプロイID取得を確認し、本番デプロイは検証済みです。

## Live参加申込修正のGitHub・本番反映

- 修正コミット `72bb7d5` をGitHubの `deploy-ui-restore` ブランチへpushしました。
- Netlify本番デプロイID: `6a5ad74a7e21772c0da5a411`
- デプロイ対象コミット: `72bb7d524b6c8fa3c999e32029f535cd57b76262`
- 計画時ビルドID: `hLH-OYnHW7koSQ3-Xx72_`
- 本番ビルドID: `m1qB0gX6qE0VK7b_Y5deL`
- 公開URL `https://el-town.jp` の疎通、コミット不変、ビルドID一致、デプロイID取得を確認し、本番デプロイは検証済みです。
- 承認付きデプロイ履歴は `.deploy/deployments.jsonl` にも `verified` として記録されています。

## Live詳細遷移・参加者表示・総合ビュー集計

- 会員画面のLiveカレンダーは、予定をタップしても申込フォームの選択値だけが変わり、詳細表示へ切り替わらないことを確認しました。
- カレンダーのLive予定をタップするとカード表示へ切り替え、該当会議の詳細カードまでスクロールし、選択中カードを強調表示するよう修正しました。
- 本番DBにはLive申込が正常保存され、会議ID、氏名、参加人数も存在していましたが、`live_session_applications` はRLS有効・SELECTポリシー0件だったため、管理画面から常に0件に見えていました。
- `docs/sql/live_application_admin_visibility_2026-07-18.sql` を作成し、有効な役員が自団体のLive申込だけを閲覧できるRLSポリシーを本番Supabaseへ適用しました。
- 実際の役員権限へ切り替えた読取テストで、対象申込の件数・氏名・参加人数合計を取得できることを確認しました。
- 管理機能の「Web会議参加者」に申込者名、申込人数、申込件数、参加人数合計を表示します。
- 総合ビューのLiveカードに「参加申込件数」「参加人数合計」を集計表示し、イベントと同様にカード下部へ参加者名と各参加人数を表示します。
- 将来の環境構築でも同じ閲覧不可が再発しないよう、既存のLive・施設用SQLにも役員閲覧ポリシーを追加しました。
- `npx.cmd tsc --noEmit --incremental false` と `npm.cmd run build` に成功しました。
- 運用手順として、修正コミットをGitHubへpushした後、承認付きNetlify本番デプロイを必ず実施し、デプロイ結果をこの履歴へ追記します。
- 修正コミット `26d4c34` をGitHubの `deploy-ui-restore` ブランチへpushし、Netlify本番へ反映しました。
- Netlify本番デプロイID: `6a5adb8299b78638b554c4aa`
- デプロイ対象コミット: `26d4c34d3484c468d2761091ff7cf1355608940e`
- 計画時ビルドID: `B9kjPZTY2jkvRhCrryQyC`
- 本番ビルドID: `f5QJTE0tgncvy1hP7MPIT`
- 公開URL `https://el-town.jp` の疎通、コミット不変、ビルドID一致、デプロイID取得を確認し、本番デプロイは検証済みです。
- 承認付きデプロイ履歴は `.deploy/deployments.jsonl` にも `verified` として記録されています。
