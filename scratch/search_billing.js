const fs = require('fs');
const path = require('path');

const brokenPath = 'C:\\Users\\info\\.gemini\\antigravity\\scratch\\qoin\\src\\components\\AdminView.tsx.broken';
if (fs.existsSync(brokenPath)) {
  const content = fs.readFileSync(brokenPath, 'utf8');
  const lines = content.split('\n');
  console.log("Searching in AdminView.tsx.broken:");
  lines.forEach((line, index) => {
    if (line.includes("SwitchToLive") || line.includes("DisconnectStripe") || line.includes("stripe_mode") || line.includes("stripe_account_id")) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });
} else {
  console.log("broken file not found");
}
