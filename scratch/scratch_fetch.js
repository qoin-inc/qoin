const fs = require('fs');
const readline = require('readline');
const path = require('path');

const logPath = 'C:\\Users\\info\\.gemini\\antigravity-ide\\brain\\95152b10-828b-4808-98d6-f9529b177cf6\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'assembly_logic.txt');

if (!fs.existsSync(logPath)) {
  console.error('Log file not found:', logPath);
  process.exit(1);
}

const rl = readline.createInterface({
  input: fs.createReadStream(logPath),
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (line.includes('fetchAssemblyData') && line.includes('tool_calls')) {
    try {
      const obj = JSON.parse(line);
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === 'replace_file_content' || tc.name === 'multi_replace_file_content') {
            const args = tc.args;
            if (args && args.ReplacementContent) {
              fs.writeFileSync(outputPath, args.ReplacementContent, 'utf8');
              console.log('Successfully extracted assembly logic block to:', outputPath);
              process.exit(0);
            }
          }
        }
      }
    } catch (e) {
      // JSON parse error (could be truncated in log)
    }
  }
});

rl.on('close', () => {
  console.log('Finished reading file. Check if assembly_logic.txt was created.');
});
