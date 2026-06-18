const fs = require('fs');
const path = require('path');

const adminViewPath = path.join(__dirname, 'qoin', 'src', 'components', 'AdminView.tsx');

if (!fs.existsSync(adminViewPath)) {
  console.error('Error: AdminView.tsx not found');
  process.exit(1);
}

let content = fs.readFileSync(adminViewPath, 'utf8');

// 1. settingsTab の型に 'assembly' を追加
const oldType = "useState<'info'|'integration'|'danger'|'roster'|'admins'|'fee'|'system_fee'|'stripe'>('info')";
const newType = "useState<'info'|'integration'|'danger'|'roster'|'admins'|'fee'|'system_fee'|'stripe'|'assembly'>('info')";

if (content.includes(oldType)) {
  content = content.replace(oldType, newType);
  console.log("Successfully updated settingsTab state type declaration.");
} else {
  console.warn("Warning: Could not find exact settingsTab type declaration. Checking fallback...");
  // 既に置換されているか、半角スペース等の違いがあるかもしれないのでチェック
  if (content.includes("'stripe'|'assembly'")) {
    console.log("Already updated settingsTab type declaration.");
  } else {
    // 部分一致で置換を試みる
    const pattern = /useState<'info'\|'integration'\|'danger'\|'roster'\|'admins'\|'fee'\|'system_fee'\|'stripe'[^>]*>\('info'\)/;
    if (pattern.test(content)) {
      content = content.replace(pattern, "useState<'info'|'integration'|'danger'|'roster'|'admins'|'fee'|'system_fee'|'stripe'|'assembly'>('info')");
      console.log("Successfully updated settingsTab type declaration via regex.");
    } else {
      console.error("Error: Could not find settingsTab declaration at all.");
      process.exit(1);
    }
  }
}

// 2. オンライン集金ボタンの直後に総会ボタンを追加
// タブボタンの切り替え部分
const stripeBtnStr = `              <button 
                onClick={() => setSettingsTab('stripe')}
                className={\`py-3 px-4 font-bold text-sm border-b-2 transition whitespace-nowrap \${settingsTab === 'stripe' ? 'border-qoin-main text-qoin-main' : 'border-transparent text-gray-500 hover:text-gray-700'}\`}
              >オンライン集金</button>`;

const assemblyBtnStr = `              <button 
                onClick={() => setSettingsTab('stripe')}
                className={\`py-3 px-4 font-bold text-sm border-b-2 transition whitespace-nowrap \${settingsTab === 'stripe' ? 'border-qoin-main text-qoin-main' : 'border-transparent text-gray-500 hover:text-gray-700'}\`}
              >オンライン集金</button>
              <button 
                onClick={() => setSettingsTab('assembly')}
                className={\`py-3 px-4 font-bold text-sm border-b-2 transition whitespace-nowrap \${settingsTab === 'assembly' ? 'border-qoin-main text-qoin-main' : 'border-transparent text-gray-500 hover:text-gray-700'}\`}
              >総会</button>`;

// 改行コード (LF/CRLF) やインデントの違いに強くなるように置換を行う
// キーワード setSettingsTab('stripe') を含む button ブロックを探す
const buttonPattern = /<button\s+onClick=\{\(\)\s*=>\s*setSettingsTab\('stripe'\)\}[\s\S]*?<\/button>/;
const match = content.match(buttonPattern);

if (match) {
  const matchedBtn = match[0];
  if (content.includes("setSettingsTab('assembly')")) {
    console.log("Assembly button already exists in the tab list.");
  } else {
    // 該当ボタンの直後に assembly ボタンを挿入
    // インデントを考慮するため、元ボタンのインデントを流用するか、手動で作成
    const assemblyBtnInserted = matchedBtn + `\n              <button \n                onClick={() => setSettingsTab('assembly')}\n                className={\`py-3 px-4 font-bold text-sm border-b-2 transition whitespace-nowrap \\\${settingsTab === 'assembly' ? 'border-qoin-main text-qoin-main' : 'border-transparent text-gray-500 hover:text-gray-700'}\`}\n              >総会</button>`;
    content = content.replace(matchedBtn, assemblyBtnInserted);
    console.log("Successfully inserted assembly tab button.");
  }
} else {
  console.error("Error: Could not find Stripe tab button in AdminView.tsx.");
  process.exit(1);
}

fs.writeFileSync(adminViewPath, content, 'utf8');
console.log("AdminView.tsx update completed successfully!");
