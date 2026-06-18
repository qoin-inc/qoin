const fs = require('fs');
const path = require('path');

const webhookPath = path.join(__dirname, 'qoin', 'netlify', 'functions', 'stripe-webhook.ts');
if (fs.existsSync(webhookPath)) {
  const content = fs.readFileSync(webhookPath, 'utf8');
  console.log("Found stripe-webhook.ts. Searching for fee_records updates...");
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (line.includes('fee_records') || line.includes('paid_amount')) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  });
} else {
  console.log("stripe-webhook.ts not found. Checking alternate paths...");
}
