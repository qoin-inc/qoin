# el-town 100町内会：環境分離・費用・ID・Codex保守（2026-09-25）

本レポートは2026-09-25時点の検討メモである。金額は各社の公開料金に基づく概算であり、現在の契約プラン、実測使用量、税、為替、個別契約条件を反映した請求見積りではない。発注・契約前に各サービスの管理画面で確認する。

## 1. 環境とアプリの反映方法

| 役割 | 構成 | データ・外部連携 |
|---|---|---|
| ローカル開発 | 現在のPCとGit作業ディレクトリ | 開発用設定。ローカルから本番DBへ書き込まない |
| 検証 | 別のNetlifyサイトと別のSupabase Project | 架空データ、Stripe Sandbox、検証用LINE/LIFF、専用Webhook・秘密情報 |
| 本番 | 既存の `el-town.jp` のNetlifyサイトと本番Supabase Project | 実データ、Stripe本番、LINE本番、専用Webhook・秘密情報 |

アプリは単一のGitリポジトリで管理する。同じ承認済みコミットを先に検証環境へ反映し、動作確認後に本番環境へ反映する。`NEXT_PUBLIC_*` はビルド時に組み込まれるため、コミットが同じでも環境別にビルドする。DB migrationは検証Projectで適用・確認してから本番Projectへ適用する。検証環境には本番の個人情報を複製しない。Supabaseも本番・ステージングの別Projectと段階的なmigrationを案内している（[Managing Environments](https://supabase.com/docs/guides/deployment/managing-environments)）。

分離前に必要な現行コードの修正：

1. `app/api/fees/create-checkout-session/route.ts` と `app/api/admin/stripe/create-account-link/route.ts` の `NODE_ENV === "production"` によるStripe本番キー必須判定を、明示的なアプリ環境判定へ変更する。Netlify上の検証サイトも本番ビルドになる。
2. `netlify.toml` の固定LIFF IDと `app/portal/page.tsx` の固定フォールバックを解消し、環境ごとの設定を使用する。
3. `deploy.config.json` と承認付きデプロイ手順で検証サイト・本番サイトを明示し、サイトの取り違えを防ぐ。現在のプレビューは本番サイト上のプレビューであり、独立した検証サイトの代わりにはしない。
4. 空の検証Supabase Projectを再現できるbaseline migration、テーブルの必要なData API `GRANT`、RLS・Storage Policy、架空のseedデータを整える。

## 2. 月額費用の目安

| 費目 | 公開料金に基づく目安 | 見積り上の注意 |
|---|---|---|
| Supabase本番＋検証 | 同一Pro組織のMicro Project 2つなら約 **$35/月**。既に本番がProの場合、検証Projectの追加は約 **$10/月** | Pro基本料$25、Micro 2つで$20、組織のCompute credit $10を控除した例。DB容量・通信量等の超過、Compute増強は別（[Pricing](https://supabase.com/pricing)、[Billing FAQ](https://supabase.com/docs/guides/platform/billing-faq)） |
| Supabase本番PITR | 7日保持は約 **$100/月**の追加。Small以上のComputeが必要 | 本番Small $15、検証Micro $10、Pro $25、credit $10、7日PITR $100なら合計約 **$140/月**。外部バックアップの保管費は別（[PITR usage](https://supabase.com/docs/guides/platform/manage-your-usage/point-in-time-recovery)） |
| Netlify | 新料金体系のProは **$20/月から**。検証サイトを増やすだけでサイト単位の定額が必ず発生するわけではない | デプロイ、Functions、通信量等の利用状況と契約プランで変わる。2025-09-04以前のアカウントは旧料金プランの可能性がある（[Pricing](https://www.netlify.com/pricing/)、[Legacy plans](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-legacy-plans/legacy-pricing-plans/)） |
| Stripe | Sandboxのテスト決済は実際の資金移動を伴わない。本番は決済額・方法・Connectの料金方式に応じて課金 | 国内カード決済の標準公開料率は成功決済ごとに3.6%。ConnectにはStripeが利用者料金を管理する方式と、プラットフォームが管理する方式があり、後者の公開例は有効アカウントごとに月¥200と入金ごとに0.25%＋¥250。現契約方式を確認してから予算化する（[Sandbox](https://docs.stripe.com/sandboxes)、[Connect料金](https://stripe.com/jp/connect/pricing)） |
| LINE公式アカウント | 現在の公開料金は無料200通、ライト月¥5,000（税別）で5,000通、スタンダード月¥15,000（税別）で30,000通、以後従量課金 | Push/Multicast等は送信人数に応じて通数を消費する。計画の75,000利用者へ月1回一斉送信すれば約75,000通。2026-10-01に追加メッセージ料金の改定予定があるため、改定後の単価で再計算する（[料金プラン](https://www.lycbiz.com/jp/service/line-official-account/plan/)） |
| Codex | 契約プランと利用量による。公開料金はPlus **$20/月**、Pro **$100/月から** | 実際の契約プランは未確認。ChatGPT WorkとCodexは利用枠を共有する（[OpenAI Docs: Pricing](https://learn.chatgpt.com/docs/pricing)） |

100団体の総額は、LINEを共通の公式アカウントから配信するか団体ごとに持つか、月間配信通数、Stripe決済件数・金額、Netlify/Supabaseの実測使用量が決まるまで確定できない。初期構築・コード改修・監視設定・バックアップ保管に要する作業費も上表には含めない。

## 3. 必要なID・アカウント数

| 対象 | 開始時の最小構成 | 100団体時の考え方 |
|---|---|---|
| GitHub | リポジトリ1つ | 原則1つ。団体ごとのリポジトリは不要 |
| Netlify | 本番サイトID 1つ＋検証サイトID 1つ | 原則2つ |
| Supabase | 本番Project ID 1つ＋検証Project ID 1つ | 原則2つ。本番DB内の `neighborhood_id` で最大100団体を識別 |
| Stripe | Platformアカウント1つ＋検証用Sandbox | 会費決済を利用する団体ごとに本番Connect accountを1つ、最大100。検証用Connect accountは本番のものと共有しない |
| LINE | 本番と検証にそれぞれLINE Login/LIFFとMessaging API・公式アカウントの設定 | 団体別の公式アカウント方式を採る場合は団体ごとのアカウントとチャネルが必要。現在の送信コードは単一トークンを使うため、団体別方式は別途改修が必要（[Messaging APIの開始手順](https://developers.line.biz/en/docs/messaging-api/getting-started/)） |
| Codex | 保守担当者の利用アカウント | 団体ごとのCodex IDは不要。人間の運用責任者・代行者には個別ログインとMFAを用意する |

LINEの最終方式は未決定。共通公式アカウントはID数と基本料金を抑えやすいが、送信者名、月間上限、障害範囲を全団体で共有する。団体別公式アカウントはそれらを分離できる一方、最大100アカウント分の契約・費用・トークン管理とアプリ改修が発生する。100団体へ拡大する前に、団体の契約主体と費用負担を決めて配信量を試算する。

## 4. Codexで担う保守と運用責任

Codexはコード修正、テスト、検証環境への反映準備、ログや障害の調査、バックアップ・設定の点検、定期レポート作成を支援できる。定期タスクでローカルのファイルを扱う場合は、PCを起動しデスクトップアプリを稼働させる必要がある（[OpenAI Docs: Scheduled tasks](https://learn.chatgpt.com/docs/automations)）。

24時間の死活監視と通知は常時稼働する外部サービスで行い、障害対応、請求、データ復元、本番公開の最終判断は人間の運用責任者が持つ。Codexによる作業は対象・権限・結果を記録し、現行の承認付き本番デプロイ手順を継続する。

## 5. 費用を確定するために必要な数値

1. 現在のNetlify・Supabase・Codexの契約プランと直近3か月の使用量。
2. LINEの共通／団体別アカウント方式、各団体の利用人数、月間配信回数。
3. Stripe Connectの料金方式、月間決済件数・金額・決済方法の構成。
4. 本番DBの復旧目標とPITR・外部バックアップの要否、保存量。
5. 保守担当者、障害時の連絡先、対応時間帯、月間作業量。
