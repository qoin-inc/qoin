const fs = require('fs');
const path = require('path');

const adminViewPath = path.join(__dirname, 'qoin', 'src', 'components', 'AdminView.tsx');

if (!fs.existsSync(adminViewPath)) {
  console.error('Error: AdminView.tsx not found');
  process.exit(1);
}

let content = fs.readFileSync(adminViewPath, 'utf8');

// 1. State定義の置換
const stateRegex = /const \[editFeeData, setEditFeeData\] = useState<\{ expected_amount: string, paid_amount: string \}>\(\{ expected_amount: '', paid_amount: '' \}\);/;
const newState = `const [editFeeData, setEditFeeData] = useState<{ expected_amount: string, paid_amount: string, paid_at: string }>({ expected_amount: '', paid_amount: '', paid_at: '' });`;

if (stateRegex.test(content)) {
  content = content.replace(stateRegex, newState);
  console.log("1. State successfully updated.");
} else {
  console.warn("Warning: Could not match state definition pattern.");
}

// 2. 「編集」クリックハンドラの置換
const editClickRegex = /onClick=\{\(\) => \{\s*setEditingFeeRosterId\(r\.roster_id\);\s*setEditFeeData\(\{\s*expected_amount: hasCustomExpected \? String\(feeRec\.expected_amount\) : '',\s*paid_amount: String\(paidAmountCash\)\s*\}\);\s*\}\}/;
const newEditClick = `onClick={() => {
                                                 setEditingFeeRosterId(r.roster_id);
                                                 setEditFeeData({
                                                   expected_amount: hasCustomExpected ? String(feeRec.expected_amount) : '',
                                                   paid_amount: String(paidAmountCash),
                                                   paid_at: feeRec?.paid_at ? feeRec.paid_at.slice(0, 10) : new Date().toISOString().slice(0, 10)
                                                 });
                                               }}`;

if (editClickRegex.test(content)) {
  content = content.replace(editClickRegex, newEditClick);
  console.log("2. Edit click handler successfully updated.");
} else {
  console.warn("Warning: Could not match edit click handler pattern.");
}

// 3. handleSaveFee の修正 (paid_at 追加)
const saveFeeRegex = /const expectedVal = editFeeData\.expected_amount === '' \? null : parseInt\(editFeeData\.expected_amount\);\s*const paidVal = parseInt\(editFeeData\.paid_amount\) \|\| 0;\s*if \(existing\) \{[\s\S]*?const stripeVal = existing\.paid_amount_stripe \|\| 0;\s*const totalPaid = paidVal \+ stripeVal;\s*const \{ error \} = await supabase\.from\('fee_records'\)\.update\(\{\s*expected_amount: expectedVal,\s*paid_amount_cash: paidVal,\s*paid_amount: totalPaid\s*\}\)\.eq\('id', existing\.id\);[\s\S]*?\} else \{[\s\S]*?const \{ error \} = await supabase\.from\('fee_records'\)\.insert\(\{\s*roster_id: rosterId,\s*year: currentYear,\s*expected_amount: expectedVal,\s*paid_amount_cash: paidVal,\s*paid_amount_stripe: 0,\s*paid_amount: paidVal\s*\}\);/;

const newSaveFee = `const expectedVal = editFeeData.expected_amount === '' ? null : parseInt(editFeeData.expected_amount);
    const paidVal = parseInt(editFeeData.paid_amount) || 0;
    const paidAtVal = paidVal > 0 ? (editFeeData.paid_at ? new Date(editFeeData.paid_at).toISOString() : new Date().toISOString()) : null;
    
    if (existing) {
      const stripeVal = existing.paid_amount_stripe || 0;
      const totalPaid = paidVal + stripeVal;
      const { error } = await supabase.from('fee_records').update({
        expected_amount: expectedVal,
        paid_amount_cash: paidVal,
        paid_amount: totalPaid,
        paid_at: paidAtVal
      }).eq('id', existing.id);
      if (error) alert('保存に失敗しました');
    } else {
      const { error } = await supabase.from('fee_records').insert({
        roster_id: rosterId,
        year: currentYear,
        expected_amount: expectedVal,
        paid_amount_cash: paidVal,
        paid_amount_stripe: 0,
        paid_amount: paidVal,
        paid_at: paidAtVal
      });`;

if (saveFeeRegex.test(content)) {
  content = content.replace(saveFeeRegex, newSaveFee);
  console.log("3. handleSaveFee successfully updated.");
} else {
  console.warn("Warning: Could not match handleSaveFee pattern.");
}

// 4. UI側インライン編集時の日付入力欄追加
const inlineEditRegex = /<td className="p-2 text-center">\s*<div className="flex flex-col items-center gap-1">\s*<input type="number" value=\{editFeeData\.paid_amount\}[\s\S]*?\/>\s*\{paidAmountStripe > 0 && \([\s\S]*?Stripe: ¥\{paidAmountStripe\.toLocaleString\(\)\}[\s\S]*?\)\}\s*<\/div>\s*<\/td>/;
const newInlineEdit = `<td className="p-2 text-center">
                                             <div className="flex flex-col items-center gap-1">
                                               <input type="number" value={editFeeData.paid_amount} onChange={e => setEditFeeData({...editFeeData, paid_amount: e.target.value})} className="w-20 border border-indigo-300 rounded px-2 py-1 text-right text-xs focus:ring-1 focus:ring-indigo-500 outline-none bg-white font-bold" />
                                               {parseInt(editFeeData.paid_amount) > 0 && (
                                                 <input 
                                                   type="date" 
                                                   value={editFeeData.paid_at} 
                                                   onChange={e => setEditFeeData({...editFeeData, paid_at: e.target.value})} 
                                                   className="w-24 border border-indigo-300 rounded px-1 py-0.5 mt-1 text-[10px] focus:ring-1 focus:ring-indigo-500 outline-none bg-white text-center font-bold text-slate-700" 
                                                 />
                                               )}
                                               {paidAmountStripe > 0 && (
                                                 <span className="text-[9px] text-gray-500 font-bold leading-none">Stripe: ¥{paidAmountStripe.toLocaleString()}</span>
                                               )}
                                             </div>
                                           </td>`;

if (inlineEditRegex.test(content)) {
  content = content.replace(inlineEditRegex, newInlineEdit);
  console.log("4. Inline edit date input successfully added.");
} else {
  console.warn("Warning: Could not match inline edit code segment.");
}

// 5. 通常表示時の入金日の表示
const normalRenderRegex = /<td className="p-3 text-center">\s*<div className="flex flex-col items-center">\s*<span className="font-mono font-bold text-gray-800">\{paidAmount\.toLocaleString\(\)\} 円<\/span>\s*\{paidAmount > 0 && \([\s\S]*?集金:[\s\S]*?Stripe:[\s\S]*?\)\}\s*<\/div>\s*<\/td>/;
const newNormalRender = `<td className="p-3 text-center">
                                             <div className="flex flex-col items-center">
                                               <span className="font-mono font-bold text-gray-800">{paidAmount.toLocaleString()} 円</span>
                                               {paidAmount > 0 && (
                                                 <div className="text-[10px] text-gray-500 mt-1 flex flex-col items-center gap-1 leading-none font-bold">
                                                   {paidAmountCash > 0 && (
                                                     <span className="text-slate-500">集金: {paidAmountCash.toLocaleString()}円</span>
                                                   )}
                                                   {paidAmountStripe > 0 && (
                                                     <span className="text-slate-500">Stripe: {paidAmountStripe.toLocaleString()}円</span>
                                                   )}
                                                   {feeRec?.paid_at && (
                                                     <span className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5 mt-0.5">
                                                       入金: {new Date(feeRec.paid_at).toLocaleDateString('ja-JP')}
                                                     </span>
                                                   )}
                                                 </div>
                                               )}
                                             </div>
                                           </td>`;

if (normalRenderRegex.test(content)) {
  content = content.replace(normalRenderRegex, newNormalRender);
  console.log("5. Normal render cell successfully updated with paid_at.");
} else {
  console.warn("Warning: Could not match normal render cell pattern.");
}

// 6. 総会側のフェッチクエリの修正 (selectにpaid_atを追加)
const assemblyQueryRegex = /\.from\('fee_records'\)\s*\.select\('paid_amount, paid_amount_cash, paid_amount_stripe, updated_at, resident_rosters!inner\(neighborhood_id\)'\)/;
const newAssemblyQuery = `.from('fee_records')
        .select('paid_amount, paid_amount_cash, paid_amount_stripe, paid_at, updated_at, resident_rosters!inner(neighborhood_id)')`;

if (assemblyQueryRegex.test(content)) {
  content = content.replace(assemblyQueryRegex, newAssemblyQuery);
  console.log("6. Assembly fetch query statement successfully updated.");
} else {
  console.warn("Warning: Could not match Assembly query statement.");
}

// 7. 総会側の月別集計ロジックを paid_at に修正 (フォールバックに updated_at)
// 7a. 会費行の集計
const matrixRowRegex = /if \(cat\.name === '会費' && !cat\.parent_id\) \{\s*return assemblyFeeRecords\s*\.filter\(\(r: any\) => \{\s*const paidVal = r\.paid_amount \|\| \(r\.paid_amount_cash \|\| 0\) \+ \(r\.paid_amount_stripe \|\| 0\);\s*if \(paidVal <= 0\) return false;\s*return new Date\(r\.updated_at\)\.getMonth\(\) \+ 1 === m;\s*\}\)/;
const newMatrixRow = `if (cat.name === '会費' && !cat.parent_id) {
                                           return assemblyFeeRecords
                                             .filter((r: any) => {
                                               const paidVal = r.paid_amount || (r.paid_amount_cash || 0) + (r.paid_amount_stripe || 0);
                                               if (paidVal <= 0) return false;
                                               const targetDate = r.paid_at ? new Date(r.paid_at) : new Date(r.updated_at);
                                               return targetDate.getMonth() + 1 === m;
                                             })`;

if (matrixRowRegex.test(content)) {
  content = content.replace(matrixRowRegex, newMatrixRow);
  console.log("7a. Matrix row calculation fixed to use paid_at.");
} else {
  console.warn("Warning: Could not match matrix row calculation.");
}

// 7b. 収入合計行の集計
const matrixTotalRegex = /const monthlyFee = assemblyFeeRecords\s*\.filter\(\(r: any\) => \{\s*const paidVal = r\.paid_amount \|\| \(r\.paid_amount_cash \|\| 0\) \+ \(r\.paid_amount_stripe \|\| 0\);\s*if \(paidVal <= 0\) return false;\s*return new Date\(r\.updated_at\)\.getMonth\(\) \+ 1 === m;\s*\}\)/;
const newMatrixTotal = `const monthlyFee = assemblyFeeRecords
                                           .filter((r: any) => {
                                             const paidVal = r.paid_amount || (r.paid_amount_cash || 0) + (r.paid_amount_stripe || 0);
                                             if (paidVal <= 0) return false;
                                             const targetDate = r.paid_at ? new Date(r.paid_at) : new Date(r.updated_at);
                                             return targetDate.getMonth() + 1 === m;
                                           })`;

if (matrixTotalRegex.test(content)) {
  content = content.replace(matrixTotalRegex, newMatrixTotal);
  console.log("7b. Matrix total calculation fixed to use paid_at.");
} else {
  console.warn("Warning: Could not match matrix total calculation.");
}

fs.writeFileSync(adminViewPath, content, 'utf8');
console.log("Header/UI update for paid_at completed.");
