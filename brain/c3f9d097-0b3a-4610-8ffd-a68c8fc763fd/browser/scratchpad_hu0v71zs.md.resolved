# Task: Create a video manual for the Resident View

## Progress
- [/] Navigate to http://localhost:3000/resident/?test_bypass=1 (Empty list)
- [ ] Wait for the page to load
- [ ] Click "詳細を確認する" on the first circular
- [ ] Wait 1 second and scroll down
- [ ] Click "一覧に戻る" or "戻る"
- [ ] Wait 2 seconds
- [ ] Task completed

## Findings
- The resident view is empty ("まだお知らせはありません").
- Console shows `neighborhood_id=eq.undefined` error in Supabase fetch.
- `test_bypass=1` works for `/resident/` but not for other pages like `/manual`.
- `/api/clean` was used by the planner recently, which likely deleted test data.
- Need to find a way to populate data or fix the `neighborhood_id` issue.
