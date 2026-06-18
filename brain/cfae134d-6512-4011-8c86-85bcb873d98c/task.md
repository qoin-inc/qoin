# 会計期開始月カスタマイズ - タスク

- `[x]` マイグレーションSQL作成 (`Day20_fiscal_start_month.sql`)
- `[x]` AdminView.tsx: `getFiscalYear()` 関数を開始月パラメータ対応に変更
- `[x]` AdminView.tsx: 基本情報タブに「会計期の開始月」設定を追加
- `[x]` AdminView.tsx: `handleUpdateSettings` で `fiscal_start_month` を保存
- `[x]` AdminView.tsx: 会費タブの年度表示を動的に変更
- `[x]` AdminView.tsx: ダッシュボードの年度計算を動的に変更
- `[x]` AdminView.tsx: `selectedFiscalYear` 初期化と年度切替の計算を修正
- `[x]` stripe-webhook.ts: 年度計算を動的化
- `[x]` ビルド確認 ✅ TypeScriptエラーなし
- `[x]` 本番デプロイ (Netlify) ✅ https://el-town.jp
- `[x]` 開発レポート Day33 作成
- `[x]` マイグレーションSQL実行 (Supabase) ✅
