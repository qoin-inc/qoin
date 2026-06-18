const fs = require('fs');
const path = require('path');

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('.next') && !file.includes('.git')) {
        results = results.concat(walk(file));
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.html') || file.endsWith('.md')) {
        results.push(file);
      }
    }
  });
  return results;
};

const files = walk('c:/Users/info/.gemini/antigravity/scratch');
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Match "町内会" but NOT followed by "・自治会" or "（自治会）"
  const regex = /町内会(?!・自治会|（自治会）|費・自治会費)/g;
  if (regex.test(content)) {
    const newContent = content.replace(regex, '町内会・自治会');
    if (newContent !== content) {
      fs.writeFileSync(file, newContent, 'utf8');
      console.log(`Updated: ${file}`);
      changedFiles++;
    }
  }
});

console.log(`Total files updated: ${changedFiles}`);
