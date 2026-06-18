import re

file_path = r"C:\Users\info\.gemini\antigravity\scratch\qoin\src\components\AdminView.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 開始位置と終了位置を特定して置換する
# 開始キー
start_key = 'placeholder={String(systemSettings?.annual_fee_amount || 3000)}\n                                              value={editFeeData.expected_amount} \n                                              onChange={e => setEditFeeData({...editFeeData, expected_amount: e.target.value})} \n                                              className="w-20 border border-indigo-300 rounded px-2 py-1 text-right text-xs focus:ring-1 focus:ring-indigo-500 outline-none" \n                                            />'
# 終了キー
end_key = '<input type="number" value={editFeeData.paid_amount} onChange={e => setEditFeeData({...editFeeData, paid_amount: e.target.value})} className="w-20 border border-indigo-300 rounded px-2 py-1 text-right text-xs focus:ring-1 focus:ring-indigo-500 outline-none" />'

# 正規表現を使わずに、単純に文字列の index で切り取る
start_idx = content.find(start_key)
if start_idx == -1:
    print("Start key not found. Trying flexible match...")
    # fallback to a simpler start key
    start_key_simple = 'value={editFeeData.expected_amount}'
    start_idx = content.find(start_key_simple)
    if start_idx != -1:
        # find the closing '/>' after it
        closing_idx = content.find('/>', start_idx)
        if closing_idx != -1:
            start_idx = closing_idx + 2
else:
    start_idx += len(start_key)

end_idx = content.find(end_key, start_idx if start_idx != -1 else 0)

if start_idx != -1 and end_idx != -1:
    print(f"Found match: start={start_idx}, end={end_idx}")
    new_content = content[:start_idx] + "\n                                          </td>\n                                          <td className=\"p-2 text-center\">\n                                            " + content[end_idx:]
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    print("Successfully repaired the file!")
else:
    print(f"Failed to find keys. start_idx={start_idx}, end_idx={end_idx}")
