const fs = require('fs');
const path = require('path');

const adminViewPath = path.join(__dirname, 'qoin', 'src', 'components', 'AdminView.tsx');

if (!fs.existsSync(adminViewPath)) {
  console.error('Error: AdminView.tsx not found');
  process.exit(1);
}

let content = fs.readFileSync(adminViewPath, 'utf8');

// 設定ボタンの直前に総会ボタンを独立して配置する
// onClick={openSettings} を含む <button ... </button> ブロックを探す
const targetSettingsBtnPattern = /<button\s+className="bg-gray-100 text-gray-600 w-12 h-12 rounded-full shadow-sm hover:bg-gray-200 transition flex items-center justify-center cursor-pointer md:w-auto md:h-auto md:px-4 md:py-3 md:rounded-xl md:font-bold"[\s\S]*?onClick=\{openSettings\}[\s\S]*?>[\s\S]*?<\/button>/;

const match = content.match(targetSettingsBtnPattern);
if (!match) {
  console.error('Error: Settings button not found in AdminView.tsx');
  process.exit(1);
}

const settingsBtnCode = match[0];

// 総会ボタンのコード定義 (emerald カラーで美しいデザイン、live/設定と同格)
const assemblyBtnCode = `          <button 
            className="bg-emerald-100 text-emerald-600 w-12 h-12 rounded-full shadow-sm hover:bg-emerald-200 transition flex items-center justify-center cursor-pointer md:w-auto md:h-auto md:px-4 md:py-3 md:rounded-xl md:font-bold border border-emerald-200"
            onClick={() => setIsAssemblyModalOpen(true)}
            title="総会"
          >
            <i className="fas fa-users md:mr-2 text-xl md:text-base"></i><span className="hidden md:inline">総会</span>
          </button>
          ` + settingsBtnCode;

if (content.includes("onClick={() => setIsAssemblyModalOpen(true)}")) {
  console.log("Assembly button already exists in navigation header.");
} else {
  content = content.replace(settingsBtnCode, assemblyBtnCode);
  console.log("Successfully inserted assembly button into navigation header.");
}

fs.writeFileSync(adminViewPath, content, 'utf8');
console.log("Header button update completed successfully!");
