const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\info\\.gemini\\antigravity\\scratch\\qoin\\src\\components\\AdminView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// ファイル内の catch (e) { alert('通信エラー: ' + e.message); } の部分を catch (e: any) { ... } に修正します。
const errorTarget = `                                } catch (e) {
                                  alert('通信エラー: ' + e.message);
                                }`;

const errorReplacement = `                                } catch (e: any) {
                                  alert('通信エラー: ' + e.message);
                                }`;

if (content.includes(errorTarget)) {
  content = content.replace(errorTarget, errorReplacement);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("Successfully fixed the TypeScript type error (e: any)!");
} else {
  console.error("Could not find the target TypeScript error pattern in AdminView.tsx");
}
