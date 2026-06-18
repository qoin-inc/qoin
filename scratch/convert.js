const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\info\\.gemini\\antigravity\\scratch\\replacement_content_final.txt', 'utf8');

console.log("Length of file:", content.length);
console.log("Starts with quote?", content.startsWith('"'));
console.log("Ends with quote?", content.endsWith('"'));
console.log("Count of literal \\n:", content.split('\\n').length - 1);
console.log("Count of literal \\\\n:", content.split('\\\\n').length - 1);
console.log("Count of actual \\n:", content.split('\n').length - 1);
console.log("First 300 chars:", content.substring(0, 300));
