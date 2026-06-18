$path = "C:\Users\info\.gemini\antigravity\scratch\qoin\src\components\AdminView.tsx"
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)

# 正規表現パターン
# editFeeData.expected_amount の input 部分から、editFeeData.paid_amount の td 部分までの壊れている箇所をマッチ
# 特殊文字 ( { } [ ] . ? * + ^ $ | \ ) はエスケープする
$pattern = '(?s)(value=\{editFeeData\.expected_amount\}\s*.*?className="w-20 border border-indigo-300 rounded px-2 py-1 text-right text-xs focus:ring-1 focus:ring-indigo-500 outline-none"\s*\/?>).*?(<td className="p-2 text-center">\s*<input type="number" value=\{editFeeData\.paid_amount\})'

# マッチするかテスト
$match = [System.Text.RegularExpressions.Regex]::Match($content, $pattern)
if ($match.Success) {
    Write-Output "Broken area found!"
    
    # 置換
    $replacement = '$1' + "`n                                          </td>`n                                          " + '$2'
    $newContent = [System.Text.RegularExpressions.Regex]::Replace($content, $pattern, $replacement)
    
    [System.IO.File]::WriteAllText($path, $newContent, [System.Text.Encoding]::UTF8)
    Write-Output "Successfully replaced and saved!"
} else {
    Write-Output "Broken area NOT found. The file might already be fixed or regex did not match."
}
