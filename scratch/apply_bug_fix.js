const fs = require('fs');
const path = require('path');

const adminViewPath = path.join(__dirname, 'qoin', 'src', 'components', 'AdminView.tsx');

if (!fs.existsSync(adminViewPath)) {
  console.error('Error: AdminView.tsx not found');
  process.exit(1);
}

let content = fs.readFileSync(adminViewPath, 'utf8');

// 1. 区分変更時の onChange の修正
const onChangeRegex = /onChange=\{\(e\)\s*=>\s*\{\s*const typeVal = e\.target\.value as 'income'\|'expense';\s*setNewSettlementType\(typeVal\);\s*const firstCat = assemblyCategories\.find\(\(c:\s*any\)\s*=>\s*c\.type === typeVal\);\s*if\s*\(firstCat\)\s*setNewSettlementCatId\(String\(firstCat\.id\)\);\s*\}\}/;
const newOnChange = `onChange={(e) => {
                                         const typeVal = e.target.value as 'income'|'expense';
                                         setNewSettlementType(typeVal);
                                         // 収入の場合は手動入力不可な「会費」を除いた最初の科目を選択
                                         const firstCat = assemblyCategories.find((c: any) => 
                                           c.type === typeVal && 
                                           !(c.type === 'income' && c.name === '会費')
                                         );
                                         if (firstCat) {
                                           setNewSettlementCatId(String(firstCat.id));
                                         } else {
                                           setNewSettlementCatId('');
                                         }
                                       }}`;

if (onChangeRegex.test(content)) {
  content = content.replace(onChangeRegex, newOnChange);
  console.log("1. onChange logic successfully fixed.");
} else {
  console.warn("Warning: Could not match onChange logic pattern.");
}

// 2. 月別・科目別マトリクス：収入合計 (incTotal) の修正
const incTotalRegex = /const incTotal = assemblySettlements\s*\.filter\(\(s:\s*any\)\s*=>\s*s\.type === 'income' && new Date\(s\.paid_date\)\.getMonth\(\) \+ 1 === m\)\s*\.reduce\(\(sum:\s*number,\s*s:\s*any\)\s*=>\s*sum \+ s\.amount,\s*0\);/;
const newIncTotal = `const incTotal = assemblySettlements
                                           .filter((s: any) => {
                                             const cat = assemblyCategories.find((c: any) => c.id === s.category_id);
                                             return cat?.type === 'income' && new Date(s.paid_date).getMonth() + 1 === m;
                                           })
                                           .reduce((sum: number, s: any) => sum + s.amount, 0);`;

if (incTotalRegex.test(content)) {
  content = content.replace(incTotalRegex, newIncTotal);
  console.log("2. Matrix income total successfully fixed.");
} else {
  console.warn("Warning: Could not match Matrix income total pattern.");
}

// 3. マトリクス：収入総合計 の修正
const incSumRegex = /assemblySettlements\.filter\(\(s:\s*any\)\s*=>\s*s\.type === 'income'\)\.reduce\(\(sum:\s*number,\s*s:\s*any\)\s*=>\s*sum \+ s\.amount,\s*0\)\s*\+\s*assemblyFeeRevenue/;
const newIncSum = `assemblySettlements.filter((s: any) => {
                                             const cat = assemblyCategories.find((c: any) => c.id === s.category_id);
                                             return cat?.type === 'income';
                                           }).reduce((sum: number, s: any) => sum + s.amount, 0) + assemblyFeeRevenue`;

if (incSumRegex.test(content)) {
  content = content.replace(incSumRegex, newIncSum);
  console.log("3. Matrix total income sum successfully fixed.");
} else {
  console.warn("Warning: Could not match Matrix total income sum pattern.");
}

// 4. 月別・科目別マトリクス：支出合計 (expTotal) の修正
const expTotalRegex = /const expTotal = assemblySettlements\s*\.filter\(\(s:\s*any\)\s*=>\s*s\.type === 'expense' && new Date\(s\.paid_date\)\.getMonth\(\) \+ 1 === m\)\s*\.reduce\(\(sum:\s*number,\s*s:\s*any\)\s*=>\s*sum \+ s\.amount,\s*0\);/;
const newExpTotal = `const expTotal = assemblySettlements
                                           .filter((s: any) => {
                                             const cat = assemblyCategories.find((c: any) => c.id === s.category_id);
                                             return cat?.type === 'expense' && new Date(s.paid_date).getMonth() + 1 === m;
                                           })
                                           .reduce((sum: number, s: any) => sum + s.amount, 0);`;

if (expTotalRegex.test(content)) {
  content = content.replace(expTotalRegex, newExpTotal);
  console.log("4. Matrix expense total successfully fixed.");
} else {
  console.warn("Warning: Could not match Matrix expense total pattern.");
}

// 5. マトリクス：支出総合計の修正
const expSumRegex = /assemblySettlements\.filter\(\(s:\s*any\)\s*=>\s*s\.type === 'expense'\)\.reduce\(\(sum:\s*number,\s*s:\s*any\)\s*=>\s*sum \+ s\.amount,\s*0\)\.reduce[\s\S]*?toLocaleString\(\)/;
// 前回手動で一部置換したため、すでに置換されているか、あるいは前回の残りでマッチさせる
const expSumRegex2 = /\{assemblySettlements\.filter\(\(s:\s*any\)\s*=>\s*s\.type === 'expense'\)\.reduce\(\(sum:\s*number,\s*s:\s*any\)\s*=>\s*sum \+ s\.amount,\s*0\)\.toLocaleString\(\)\}/;

const newExpSum = `{assemblySettlements.filter((s: any) => {
                                           const cat = assemblyCategories.find((c: any) => c.id === s.category_id);
                                           return cat?.type === 'expense';
                                         }).reduce((sum: number, s: any) => sum + s.amount, 0).toLocaleString()}`;

if (expSumRegex2.test(content)) {
  content = content.replace(expSumRegex2, newExpSum);
  console.log("5. Matrix total expense sum successfully fixed.");
} else {
  console.log("5. Matrix total expense sum already fixed or skipped.");
}

// 6. 明細一覧表示：type 判定の修正
const listRenderRegex = /const cat = assemblyCategories\.find\(\(c:\s*any\)\s*=>\s*c\.id === item\.category_id\);\s*return\s*\(\s*<tr key=\{item\.id\}[\s\S]*?item\.type === 'income'[\s\S]*?item\.type === 'income'\s*\?\s*'収入'\s*:\s*'支出'/;
const newListRender = `const cat = assemblyCategories.find((c: any) => c.id === item.category_id);
                                         const isIncome = cat ? cat.type === 'income' : false;
                                         return (
                                           <tr key={item.id} className="hover:bg-slate-50/50 text-slate-700 transition">
                                             <td className="py-2.5 px-4 font-mono font-semibold">{item.paid_date}</td>
                                             <td className="py-2.5 px-4">
                                               <span className={\`px-2 py-0.5 rounded-full text-[10px] font-bold \${
                                                 isIncome 
                                                   ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                                   : 'bg-rose-50 text-rose-700 border border-rose-100'
                                               }\`}>
                                                 {isIncome ? '収入' : '支出'}`;

if (listRenderRegex.test(content)) {
  content = content.replace(listRenderRegex, newListRender);
  console.log("6. List rendering logic successfully fixed.");
} else {
  console.warn("Warning: Could not match List rendering logic pattern.");
}

fs.writeFileSync(adminViewPath, content, 'utf8');
console.log("Bug fix process completed.");
