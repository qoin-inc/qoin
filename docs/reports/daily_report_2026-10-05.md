# 日報 2026-10-05

対象：el-town。日本時間。本日の利用者による管理画面操作と、画面共有で確認した範囲を記録する。

## 本日の実績

### 検証用Supabase Projectの作成

- 既存のSupabase Pro組織 `info@qoin.co.jp's Org` に、検証用Project `el-town-staging` を新規作成した。新しい組織は作成していない。
- 作成後のダッシュボードで、Projectの状態が `Healthy`、Computeが `Micro`、リージョンが `Northeast Asia (Tokyo)` であることを確認した。
- 作成画面でData APIを有効にし、新規テーブルの自動公開を無効、automatic RLSを有効にしたことを確認した。データベースパスワードは画面上で強度条件を満たしていた。秘密値は本報告書に記載しない。
- ダッシュボードには、GitHubリポジトリ未接続、migration未適用と表示されていた。検証用DBへのアプリ接続、データ投入、Netlify・LINEの検証環境への接続は行っていない。
- Project URLはダッシュボードに表示されている。Project RefはそのURLの `https://` と `.supabase.co` の間の識別子であることを確認した。環境台帳への転記完了は未確認。

### 次工程の整理

- 空のSupabase Projectへ適用できるbaseline migrationが現行リポジトリにはなく、既存のmigrationは差分が中心であることを再確認した。
- NetlifyとLINEの検証用リソースは、baseline migrationの完成前に作成できる。ただし、現行アプリの本番LIFF ID固定値、Stripe環境判定、デプロイ先選択を修正するまで、検証サイトへのアプリの自動デプロイ・公開は行わない方針を確認した。
- 検証には架空データを使い、本番会員データは複製しない。

## 明日やること（2026-10-06）

1. Supabase検証用ProjectのProject Ref・Project URL・リージョン・Computeを環境台帳に記録し、組織のBilling画面で追加Projectの実際の請求見込みを確認する。DBパスワードとAPI秘密キーは環境台帳やGitに書かず、秘密管理先に保管する。
2. 本番DBの構造をデータ抜きで確認し、空の検証DBを再現するbaseline migrationの作成に着手する。必要なGRANT、RLS・Storage Policyと架空seedの範囲を整理する。
3. Netlifyの検証用siteを、現行アプリの自動デプロイを開始しない方法で用意し、Site IDと検証用URLを記録する。LINEの検証用Provider・公式アカウント・LINE Login・Messaging API・LIFFの作成順と権限を確認する。LIFF Endpoint URLには検証用Netlify URLを使用する。
4. 環境別のLIFF ID、Stripeキー判定、デプロイ先選択の修正計画を具体化する。検証結果がそろうまで本番反映は判断しない。

本日報は記録のみ。検証環境・本番へのデプロイや外部への通知は行っていない。
