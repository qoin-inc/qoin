const fs = require('fs');
const path = require('path');

const uiSnippetPath = path.join(__dirname, 'assembly_ui.tsx');
if (!fs.existsSync(uiSnippetPath)) {
  console.error('Error: assembly_ui.tsx not found');
  process.exit(1);
}

let content = fs.readFileSync(uiSnippetPath, 'utf8');

// 1. 先頭部分の置換 (モーダル背景とダイアログ枠、ヘッダー追加)
const oldHeaderPattern = `              {/* タブ9: 総会管理（予算書・決算書） */}
              {settingsTab === 'assembly' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-white border border-slate-200 p-4 md:p-6 rounded-2xl shadow-sm animate-fadeIn">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 mb-6">`;

const newHeader = `              {/* -------------------- 総会（予算書・決算書）管理モーダル -------------------- */}
              {isAssemblyModalOpen && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden relative border border-slate-100 animate-scaleIn">
                    {/* 閉じるボタン */}
                    <button 
                      onClick={() => setIsAssemblyModalOpen(false)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition cursor-pointer z-10"
                      title="閉じる"
                    >
                      <i className="fas fa-times text-2xl"></i>
                    </button>
                    {/* ヘッダー領域 */}
                    <div className="p-6 md:p-8 border-b border-gray-200 shrink-0 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">`;

// 改行コード（CRLF / LF）に依存しないように置換するため、正規表現や改行の標準化を行います
// 改行を \n に統一
content = content.replace(/\r\n/g, '\n');

const normalizedOldHeader = oldHeaderPattern.replace(/\r\n/g, '\n');
if (content.includes(normalizedOldHeader)) {
  content = content.replace(normalizedOldHeader, newHeader);
  console.log("Header wrapper successfully converted.");
} else {
  // 部分的な置換を試みる
  console.log("Exact old header pattern not found. Trying regex...");
  const regexPattern = /\{\/\* タブ9: 総会管理（予算書・決算書） \*\/\}\s*\{settingsTab === 'assembly' && \(\s*<div className="space-y-6 animate-fadeIn">\s*<div className="bg-white border border-slate-200 p-4 md:p-6 rounded-2xl shadow-sm animate-fadeIn">\s*<div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4 mb-6">/;
  if (regexPattern.test(content)) {
    content = content.replace(regexPattern, newHeader);
    console.log("Header wrapper successfully converted via regex.");
  } else {
    console.error("Error: Could not convert header wrapper.");
    process.exit(1);
  }
}

// 2. ドロップダウンヘッダー (16〜29行目) 直後にスクロールエリア用 div 開始を追加
// ドロップダウンの終わりは </select>\n</div>\n</div> （元の27〜29行目）
const dropdownEndPattern = `                        </select>
                      </div>
                    </div>`;

const newDropdownEnd = `                        </select>
                      </div>
                    </div>
                    
                    {/* モーダルコンテンツ（スクロール可能）領域 */}
                    <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">`;

const normalizedDropdownEnd = dropdownEndPattern.replace(/\r\n/g, '\n');
if (content.includes(normalizedDropdownEnd)) {
  content = content.replace(normalizedDropdownEnd, newDropdownEnd);
  console.log("Dropdown end successfully converted.");
} else {
  // 部分一致
  console.log("Exact dropdown end not found. Trying regex...");
  const regexEnd = /<\/select>\s*<\/div>\s*<\/div>/;
  if (regexEnd.test(content)) {
    content = content.replace(regexEnd, `</select>\n                      </div>\n                    </div>\n                    \n                    {/* モーダルコンテンツ（スクロール可能）領域 */}\n                    <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">`);
    console.log("Dropdown end successfully converted via regex.");
  } else {
    console.error("Error: Could not convert dropdown end.");
    process.exit(1);
  }
}

// 3. 末尾の閉じタグの変更
// 元々は:
//                   </div>
//                 </div>
//               )}
// 変更後は:
//                     </div> {/* スクロールコンテンツ領域の閉じ */}
//                   </div> {/* モーダルダイアログ枠の閉じ */}
//                 </div> {/* 固定レイアウトオーバーレイの閉じ */}
//               )}
const oldFooter = `                  </div>
                </div>
              )}`;

const newFooter = `                    </div>
                  </div>
                </div>
              )}`;

const normalizedOldFooter = oldFooter.replace(/\r\n/g, '\n');
if (content.includes(normalizedOldFooter)) {
  content = content.replace(normalizedOldFooter, newFooter);
  console.log("Footer wrapper successfully converted.");
} else {
  // 正規表現で末尾付近の置換を試みる
  console.log("Exact old footer not found. Trying regex...");
  const lastIndex = content.lastIndexOf(')}');
  if (lastIndex !== -1) {
    const footerSearch = content.substring(lastIndex - 100);
    // 最後から3番目の </div> から最後までを置換する
    const footerRegex = /<\/div>\s*<\/div>\s*\}\)/;
    if (footerRegex.test(footerSearch)) {
      const replacedSearch = footerSearch.replace(footerRegex, `</div>\n                  </div>\n                </div>\n              )}`);
      content = content.substring(0, lastIndex - 100) + replacedSearch;
      console.log("Footer wrapper successfully converted via regex.");
    } else {
      console.error("Error: Could not convert footer wrapper.");
      process.exit(1);
    }
  } else {
    console.error("Error: Could not find footer at all.");
    process.exit(1);
  }
}

fs.writeFileSync(uiSnippetPath, content, 'utf8');
console.log("assembly_ui.tsx successfully converted to Independent Modal layout!");
