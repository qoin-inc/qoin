const fs = require('fs');
const path = require('path');

const adminViewPath = path.join(__dirname, 'qoin', 'src', 'components', 'AdminView.tsx');
const backendSnippetPath = path.join(__dirname, 'assembly_backend.tsx');

if (!fs.existsSync(adminViewPath)) {
  console.error('Error: AdminView.tsx not found');
  process.exit(1);
}
if (!fs.existsSync(backendSnippetPath)) {
  console.error('Error: assembly_backend.tsx not found');
  process.exit(1);
}

// 1. assembly_backend.tsx からコードを読み込む
let decodedCode = fs.readFileSync(backendSnippetPath, 'utf8');

// 先頭にある '  }, [isSettingsOpen, settingsTab]);\n\n' 部分を取り除く（念のため）
const markerToRemove = '  }, [isSettingsOpen, settingsTab]);';
if (decodedCode.includes(markerToRemove)) {
  const idx = decodedCode.indexOf(markerToRemove);
  decodedCode = decodedCode.substring(idx + markerToRemove.length);
}

// クリーニングして余分な改行などを除去
decodedCode = decodedCode.trim();

// 2. AdminView.tsx への挿入
let adminViewContent = fs.readFileSync(adminViewPath, 'utf8');

const targetStr = '  const fetchAdmins = async () => {';
if (!adminViewContent.includes(targetStr)) {
  console.error('Error: Target string (fetchAdmins definition) not found in AdminView.tsx');
  process.exit(1);
}

// fetchAdmins の直前にデコードしたコードを挿入
const replacement = decodedCode + '\n\n  ' + targetStr;
adminViewContent = adminViewContent.replace(targetStr, replacement);

fs.writeFileSync(adminViewPath, adminViewContent, 'utf8');
console.log('Successfully restored and merged assembly logic into AdminView.tsx!');
