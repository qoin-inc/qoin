# 会計期開始月のカスタマイズ機能

## 背景

現在、会費管理の年度計算（`getFiscalYear()`関数）は**4月始まりがハードコーディング**されています。自治会ごとに会計年度の開始月が異なる可能性があるため、基本情報設定から会計期の開始月を自由に設定できるようにします。

## 現状の問題点

1. `getFiscalYear()` 関数がL8-11で4月始まり固定
2. 会費タブの年度表示が `{year}年4月〜{year+1}年3月` とハードコーディング
3. `neighborhoods` テーブルに会計期開始月のカラムが存在しない
4. Stripe webhook (`stripe-webhook.ts` L113) で `new Date().getFullYear()` を使用しており、年度計算がフロントエンドと不整合

## 提案する変更

---

### データベース (neighborhoods テーブル)

#### [NEW] マイグレーションSQL

`neighborhoods` テーブルに `fiscal_start_month` カラム（INTEGER, デフォルト4）を追加:

```sql
ALTER TABLE neighborhoods ADD COLUMN fiscal_start_month INTEGER DEFAULT 4 CHECK (fiscal_start_month >= 1 AND fiscal_start_month <= 12);
```

> [!IMPORTANT]
> このSQLは手動でSupabaseのSQL Editorで実行する必要があります。

---

### フロントエンド

#### [MODIFY] [AdminView.tsx](file:///C:/Users/info/.gemini/antigravity/scratch/qoin/src/components/AdminView.tsx)

**1. `getFiscalYear()` 関数を開始月パラメータ対応に変更 (L8-11)**

```diff
-function getFiscalYear(date: Date = new Date()): number {
-  const month = date.getMonth() + 1;
-  return month >= 4 ? date.getFullYear() : date.getFullYear() - 1;
-}
+function getFiscalYear(date: Date = new Date(), startMonth: number = 4): number {
+  const month = date.getMonth() + 1;
+  return month >= startMonth ? date.getFullYear() : date.getFullYear() - 1;
+}
```

**2. `settingsData` から `fiscal_start_month` を取得して使用**

- `openSettings()` で `neighborhoods` テーブルから取得済み（`select('*')`）
- `settingsData.fiscal_start_month` を `getFiscalYear()` の呼び出しに渡す
- 年度の期間表示を動的に計算:
  - 開始月が1月の場合: `{year}年1月〜{year}年12月`（同年内）
  - 開始月が4月の場合: `{year}年4月〜{year+1}年3月`（翌年にまたがる）

**3. 基本情報タブに「会計期の開始月」を追加 (L1966付近)**

- 世帯数セレクトの前に、月選択のドロップダウンを追加
- 1月〜12月の選択肢（デフォルト: 4月）
- `handleUpdateSettings` で `fiscal_start_month` を保存

**4. ダッシュボードの「今年度の会費納入状況」を動的に対応 (L197-213)**

- `fetchDashboardStats` 内の `getFiscalYear()` 呼び出しに開始月を渡す

**5. 会費タブの年度期間表示を動的に変更 (L2483)**

```diff
-{selectedFiscalYear}年度（{selectedFiscalYear}年4月〜{selectedFiscalYear + 1}年3月）
+{selectedFiscalYear}年度（{selectedFiscalYear}年{fiscalStartMonth}月〜{...}年{...}月）
```

---

### バックエンド (Stripe Webhook)

#### [MODIFY] [stripe-webhook.ts](file:///C:/Users/info/.gemini/antigravity/scratch/qoin/netlify/functions/stripe-webhook.ts)

**L112-118: `currentYear` を `getFiscalYear()` 相当のロジックに変更**

```diff
-const currentYear = new Date().getFullYear();
+// 自治会の会計期開始月を取得して年度計算
+const { data: neighborhood } = await supabase
+  .from('neighborhoods')
+  .select('fiscal_start_month')
+  .eq('id', billingData.neighborhood_id)
+  .single();
+const startMonth = neighborhood?.fiscal_start_month || 4;
+const now = new Date();
+const month = now.getMonth() + 1;
+const currentYear = month >= startMonth ? now.getFullYear() : now.getFullYear() - 1;
```

---

## User Review Required

> [!IMPORTANT]
> **マイグレーションSQL**: `neighborhoods` テーブルへの `fiscal_start_month` カラム追加は、SupabaseのSQL Editorで手動実行が必要です。コード変更と合わせて実行してください。

> [!WARNING]
> **既存データへの影響**: 会計期開始月を変更すると、同じ年度の `fee_records` のデータの意味合いが変わります。例えば、4月→1月に変更した場合、既存の「2025年度」のデータが「2025年1月〜12月」を指すことになります。既存の年度データが正しく解釈されるよう、変更は年度の切り替わりタイミングで行うことを推奨します。

## Open Questions

> [!IMPORTANT]
> **デフォルト値について**: 既存の自治会は `fiscal_start_month` が NULL になるため、デフォルト4（4月始まり）として扱います。問題ないでしょうか？

## 対象ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `database/Day20_fiscal_start_month.sql` | [NEW] マイグレーションSQL |
| `src/components/AdminView.tsx` | [MODIFY] getFiscalYear動的化、基本情報に開始月設定追加、年度表示動的化 |
| `netlify/functions/stripe-webhook.ts` | [MODIFY] 年度計算を動的化 |

## 検証計画

### 手動検証
1. 基本情報タブで開始月を変更し、保存が成功することを確認
2. 会費管理タブで年度表示が設定した開始月に基づいて正しく表示されることを確認
3. 年度切り替え（前年度/次年度）ボタンが正しく動作することを確認
4. ダッシュボードの「今年度の会費納入状況」が正しい年度を参照していることを確認
