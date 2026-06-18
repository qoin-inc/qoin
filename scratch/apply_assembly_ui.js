const fs = require('fs');
const path = require('path');

const adminViewPath = path.join(__dirname, 'qoin', 'src', 'components', 'AdminView.tsx');
const uiSnippetPath = path.join(__dirname, 'assembly_ui.tsx');

if (!fs.existsSync(adminViewPath)) {
  console.error('Error: AdminView.tsx not found at', adminViewPath);
  process.exit(1);
}
if (!fs.existsSync(uiSnippetPath)) {
  console.error('Error: assembly_ui.tsx not found at', uiSnippetPath);
  process.exit(1);
}

let adminViewContent = fs.readFileSync(adminViewPath, 'utf8');
const uiSnippetContent = fs.readFileSync(uiSnippetPath, 'utf8');

// Stripe決済モーダルの直前に独立した総会管理モーダルを挿入する
const marker = '{/* Stripe決済モーダル */}';
if (!adminViewContent.includes(marker)) {
  console.error('Error: StripePaymentModal marker not found in AdminView.tsx');
  process.exit(1);
}

const parts = adminViewContent.split(marker);
adminViewContent = parts[0] + uiSnippetContent + '\n\n      ' + marker + parts[1];

fs.writeFileSync(adminViewPath, adminViewContent, 'utf8');
console.log('Successfully inserted independent assembly UI snippet before StripePaymentModal in AdminView.tsx!');
