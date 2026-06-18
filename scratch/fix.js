const fs = require('fs');
const path = require('path');

const targetFilePath = 'C:\\Users\\info\\.gemini\\antigravity\\scratch\\qoin\\src\\components\\AdminView.tsx';
let content = fs.readFileSync(targetFilePath, 'utf8');

// 改行コードに関わらずマッチさせるために正規表現を使用します
// editFeeData.expected_amount の入力フィールドから editFeeData.paid_amount の入力フィールドまでの間のゴミコードを消去
const regex = /(value=\{editFeeData\.expected_amount\}\s*[\s\S]*?className="w-20 border border-indigo-300 rounded px-2 py-1 text-right text-xs focus:ring-1 focus:ring-indigo-500 outline-none"\s*\/>)[\s\S]*?(<td className="p-2 text-center">\s*<input type="number" value=\{editFeeData\.paid_amount\})/g;

// 置換処理
const newContent = content.replace(regex, (match, p1, p2) => {
  console.log('Match found and replaced.');
  return p1 + '\n                                          </td>\n                                          ' + p2;
});

if (content !== newContent) {
  fs.writeFileSync(targetFilePath, newContent, 'utf8');
  console.log('Successfully repaired AdminView.tsx!');
} else {
  console.error('Failed to find the broken section in AdminView.tsx.');
}
