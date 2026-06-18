const fs = require('fs');
const path = require('path');

const adminViewPath = path.join(__dirname, 'qoin', 'src', 'components', 'AdminView.tsx');

if (!fs.existsSync(adminViewPath)) {
  console.error('Error: AdminView.tsx not found');
  process.exit(1);
}

let content = fs.readFileSync(adminViewPath, 'utf8');

// 1. State定義の追加
const stateRegex = /const \[assemblyFeeRevenue, setAssemblyFeeRevenue\] = useState\(0\);/;
const newState = `const [assemblyFeeRevenue, setAssemblyFeeRevenue] = useState(0);
  const [assemblyFeeRecords, setAssemblyFeeRecords] = useState<any[]>([]);`;

if (stateRegex.test(content)) {
  content = content.replace(stateRegex, newState);
  console.log("1. State successfully added.");
} else {
  console.warn("Warning: Could not match state definition pattern.");
}

// 2. クエリの修正 (selectにupdated_atを追加)
const queryRegex = /\.from\('fee_records'\)\s*\.select\('paid_amount, paid_amount_cash, paid_amount_stripe, resident_rosters!inner\(neighborhood_id\)'\)/;
const newQuery = `.from('fee_records')
        .select('paid_amount, paid_amount_cash, paid_amount_stripe, updated_at, resident_rosters!inner(neighborhood_id)')`;

if (queryRegex.test(content)) {
  content = content.replace(queryRegex, newQuery);
  console.log("2. Database query select statement successfully updated.");
} else {
  console.warn("Warning: Could not match Database query statement.");
}

// setAssemblyFeeRecords(feeRecs || []); の追加
const fetchSaveRegex = /setAssemblyFeeRevenue\(totalFeeRevenue\);/;
const newFetchSave = `setAssemblyFeeRevenue(totalFeeRevenue);
      setAssemblyFeeRecords(feeRecs || []);`;

if (fetchSaveRegex.test(content)) {
  content = content.replace(fetchSaveRegex, newFetchSave);
  console.log("2b. fetch save hook successfully updated.");
} else {
  console.warn("Warning: Could not match fetch save hook.");
}

// 3. マトリクス内の「会費」行の月別集計ロジックの修正
const monthlyAmountsRegex = /\/\/ 各月の集計\s*const monthlyAmounts = \[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3\]\.map\(\(m: number\) => \{\s*if \(cat\.name === '会費' && !cat\.parent_id\) return 0;\s*return matching\s*\.filter\(\(s: any\) => new Date\(s\.paid_date\)\.getMonth\(\) \+ 1 === m\)\s*\.reduce\(\(sum: number, s: any\) => sum \+ s\.amount, 0\);\s*\}\);/;
const newMonthlyAmounts = `// 各月の集計
                                       const monthlyAmounts = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((m: number) => {
                                         if (cat.name === '会費' && !cat.parent_id) {
                                           return assemblyFeeRecords
                                             .filter((r: any) => {
                                               const paidVal = r.paid_amount || (r.paid_amount_cash || 0) + (r.paid_amount_stripe || 0);
                                               if (paidVal <= 0) return false;
                                               return new Date(r.updated_at).getMonth() + 1 === m;
                                             })
                                             .reduce((sum: number, r: any) => sum + (r.paid_amount || (r.paid_amount_cash || 0) + (r.paid_amount_stripe || 0)), 0);
                                         }
                                         return matching
                                           .filter((s: any) => new Date(s.paid_date).getMonth() + 1 === m)
                                           .reduce((sum: number, s: any) => sum + s.amount, 0);
                                       });`;

if (monthlyAmountsRegex.test(content)) {
  content = content.replace(monthlyAmountsRegex, newMonthlyAmounts);
  console.log("3. Matrix row calculation logic successfully fixed.");
} else {
  console.warn("Warning: Could not match Matrix row calculation pattern.");
}

// 4. マトリクス内「会費」行の月別のレンダリング表示の修正
const renderCellRegex = /\{cat\.name === '会費' && !cat\.parent_id \? '-' : amount === 0 \? '0' : amount\.toLocaleString\(\)\}/;
const newRenderCell = `{amount === 0 ? '0' : amount.toLocaleString()}`;

if (renderCellRegex.test(content)) {
  content = content.replace(renderCellRegex, newRenderCell);
  console.log("4. Cell render logic successfully updated.");
} else {
  console.warn("Warning: Could not match Cell render logic pattern.");
}

// 5. 最下部「収入合計」の各月のセルの修正
const incTotalCellRegex = /const incTotal = assemblySettlements\s*\.filter\(\(s: any\) => \{\s*const cat = assemblyCategories\.find\(\(c: any\) => c\.id === s\.category_id\);\s*return cat\?\.type === 'income' && new Date\(s\.paid_date\)\.getMonth\(\) \+ 1 === m;\s*\}\)\s*\.reduce\(\(sum: number, s: any\) => sum \+ s\.amount, 0\);\s*return \(\s*<td key=\{m\} className="py-2 px-1\.5 text-right font-mono text-emerald-700">\s*\{incTotal\.toLocaleString\(\)\}\s*<\/td>\s*\);/;
const newIncTotalCell = `const incTotal = assemblySettlements
                                           .filter((s: any) => {
                                             const cat = assemblyCategories.find((c: any) => c.id === s.category_id);
                                             return cat?.type === 'income' && new Date(s.paid_date).getMonth() + 1 === m;
                                           })
                                           .reduce((sum: number, s: any) => sum + s.amount, 0);

                                         const monthlyFee = assemblyFeeRecords
                                           .filter((r: any) => {
                                             const paidVal = r.paid_amount || (r.paid_amount_cash || 0) + (r.paid_amount_stripe || 0);
                                             if (paidVal <= 0) return false;
                                             return new Date(r.updated_at).getMonth() + 1 === m;
                                           })
                                           .reduce((sum: number, r: any) => sum + (r.paid_amount || (r.paid_amount_cash || 0) + (r.paid_amount_stripe || 0)), 0);

                                         return (
                                           <td key={m} className="py-2 px-1.5 text-right font-mono text-emerald-700">
                                             {(incTotal + monthlyFee).toLocaleString()}
                                           </td>
                                         );`;

if (incTotalCellRegex.test(content)) {
  content = content.replace(incTotalCellRegex, newIncTotalCell);
  console.log("5. Income total monthly cells successfully fixed.");
} else {
  console.warn("Warning: Could not match Income total monthly cells pattern.");
}

fs.writeFileSync(adminViewPath, content, 'utf8');
console.log("Fee matrix fix completed.");
