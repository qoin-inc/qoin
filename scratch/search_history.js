const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\info\\.gemini\\antigravity-ide\\brain\\95152b10-828b-4808-98d6-f9529b177cf6\\.system_generated\\logs\\transcript.jsonl';

if (!fs.existsSync(logPath)) {
  console.error('Log file not found:', logPath);
  process.exit(1);
}

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  output: process.stdout,
  terminal: false
});

let found = false;
rl.on('line', (line) => {
  if (line.includes('fetchAssemblyData')) {
    found = true;
    console.log('--- FOUND MATCHING LINE ---');
    // 長いので一部だけ切り出して表示
    const idx = line.indexOf('fetchAssemblyData');
    console.log(line.substring(Math.max(0, idx - 100), Math.min(line.length, idx + 1000)));
  }
});

rl.on('close', () => {
  if (!found) {
    console.log('No matches found for fetchAssemblyData in transcript.jsonl');
  }
});
