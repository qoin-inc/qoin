const fs = require('fs');
const path = require('path');

const adminViewPath = path.join(__dirname, 'qoin', 'src', 'components', 'AdminView.tsx');

if (!fs.existsSync(adminViewPath)) {
  console.error('Error: AdminView.tsx not found');
  process.exit(1);
}

let content = fs.readFileSync(adminViewPath, 'utf8');

// 削除対象の alert 文のリスト
const alertsToRemove = [
  "alert('科目を追加しました。');",
  "alert('科目名を変更しました。');",
  "alert('科目を削除しました。');",
  "alert('予算額を保存しました。');",
  "alert('実績明細を追加しました。');",
  "alert('明細データを削除しました。');"
];

let count = 0;
alertsToRemove.forEach((alertStr) => {
  if (content.includes(alertStr)) {
    content = content.replace(alertStr, "");
    console.log(`Successfully removed: ${alertStr}`);
    count++;
  } else {
    console.warn(`Warning: Could not find alert: ${alertStr}`);
  }
});

if (count > 0) {
  fs.writeFileSync(adminViewPath, content, 'utf8');
  console.log(`Successfully removed ${count} alert popups from AdminView.tsx!`);
} else {
  console.error("Error: No alerts were removed.");
  process.exit(1);
}
