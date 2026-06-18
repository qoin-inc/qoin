  // --- 総会（予算書・決算書）管理機能のState & 関数 ---
  const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);
  const [assemblySubTab, setAssemblySubTab] = useState<'category'|'budget'|'settlement_input'|'settlement_view'>('category');
  const [assemblyCategories, setAssemblyCategories] = useState<any[]>([]);
  const [assemblyBudgets, setAssemblyBudgets] = useState<any[]>([]);
  const [assemblySettlements, setAssemblySettlements] = useState<any[]>([]);
  const [selectedSettlementMonth, setSelectedSettlementMonth] = useState<string>('all');
  const [isAssemblyLoading, setIsAssemblyLoading] = useState(false);

  // 科目登録・編集フォーム用
  const [newCatName, setNewCatName] = useState('');
  const [newCatParentId, setNewCatParentId] = useState<string>('');
  const [newCatType, setNewCatType] = useState<'income'|'expense'>('income');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // 予算額編集用の一時メモリ (category_id -> { budget_amount, previous_budget_amount, note })
  const [budgetDraft, setBudgetDraft] = useState<Record<string, { budget_amount: number, previous_budget_amount: number, note: string }>>({});

  // 決算実績明細登録フォーム用
  const [newSettlementDate, setNewSettlementDate] = useState(new Date().toISOString().slice(0, 10));
  const [newSettlementType, setNewSettlementType] = useState<'income'|'expense'>('expense');
  const [newSettlementCatId, setNewSettlementCatId] = useState<string>('');
  const [newSettlementAmount, setNewSettlementAmount] = useState('');
  const [newSettlementDesc, setNewSettlementDesc] = useState('');
  const [newSettlementFile, setNewSettlementFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // 会費の決算額 (自動連携)
  const [assemblyFeeRevenue, setAssemblyFeeRevenue] = useState(0);

  const fetchAssemblyData = async () => {
    setIsAssemblyLoading(true);
    try {
      // 1. 科目マスタの取得
      let { data: cats, error: catErr } = await supabase
        .from('assembly_categories')
        .select('*')
        .eq('neighborhood_id', townId)
        .order('id', { ascending: true });
      if (catErr) throw catErr;

      // 初回アクセス時のデフォルト科目の自動生成
      if (!cats || cats.length === 0) {
        const defaultCats = [
          { neighborhood_id: townId, type: 'income', name: '会費' },
          { neighborhood_id: townId, type: 'income', name: '補助金' },
          { neighborhood_id: townId, type: 'income', name: '事業収入' },
          { neighborhood_id: townId, type: 'income', name: '繰越金' },
          { neighborhood_id: townId, type: 'income', name: '雑入' },
          { neighborhood_id: townId, type: 'expense', name: '会議費' },
          { neighborhood_id: townId, type: 'expense', name: '事務費' },
          { neighborhood_id: townId, type: 'expense', name: '報酬' },
          { neighborhood_id: townId, type: 'expense', name: '集会所管理費' },
          { neighborhood_id: townId, type: 'expense', name: '慶弔費' },
          { neighborhood_id: townId, type: 'expense', name: '事業費' },
          { neighborhood_id: townId, type: 'expense', name: '予備費' }
        ];
        const { error: insErr } = await supabase.from('assembly_categories').insert(defaultCats);
        if (insErr) throw insErr;
        
        // 再フェッチ
        const { data: refetchedCats, error: refetchErr } = await supabase
          .from('assembly_categories')
          .select('*')
          .eq('neighborhood_id', townId)
          .order('id', { ascending: true });
        if (refetchErr) throw refetchErr;
        cats = refetchedCats;
      }
      setAssemblyCategories(cats || []);

      // デフォルトで科目のセレクトボックス初期選択を設定する
      if (cats && cats.length > 0) {
        const firstExpense = cats.find((c: any) => c.type === 'expense');
        if (firstExpense) setNewSettlementCatId(String(firstExpense.id));
      }

      // 2. 予算データの取得
      const { data: budgets, error: budErr } = await supabase
        .from('assembly_budgets')
        .select('*')
        .eq('neighborhood_id', townId)
        .eq('fiscal_year', selectedFiscalYear);
      if (budErr) throw budErr;
      setAssemblyBudgets(budgets || []);

      // 予算額の下書き（Draft）をマージして初期化
      const draft: Record<string, { budget_amount: number, previous_budget_amount: number, note: string }> = {};
      cats?.forEach((cat: any) => {
        const existing = budgets?.find((b: any) => b.category_id === cat.id);
        draft[String(cat.id)] = {
          budget_amount: existing ? existing.budget_amount : 0,
          previous_budget_amount: existing ? existing.previous_budget_amount : 0,
          note: existing ? (existing.note || '') : ''
        };
      });
      setBudgetDraft(draft);

      // 3. 決算・実績データの取得
      const { data: settlements, error: setErr } = await supabase
        .from('assembly_settlements')
        .select('*')
        .eq('neighborhood_id', townId)
        .eq('fiscal_year', selectedFiscalYear)
        .order('paid_date', { ascending: true });
      if (setErr) throw setErr;
      setAssemblySettlements(settlements || []);

      // 4. 会費データの自動連携
      const { data: feeRecs, error: feeErr } = await supabase
        .from('fee_records')
        .select('paid_amount, paid_amount_cash, paid_amount_stripe')
        .eq('neighborhood_id', townId)
        .eq('year', selectedFiscalYear);
      
      let totalFeeRevenue = 0;
      if (!feeErr && feeRecs) {
        totalFeeRevenue = feeRecs.reduce((sum: number, r: any) => sum + (r.paid_amount || (r.paid_amount_cash || 0) + (r.paid_amount_stripe || 0)), 0);
      }
      setAssemblyFeeRevenue(totalFeeRevenue);

    } catch (e: any) {
      console.error(e);
      alert('総会データの取得に失敗しました。');
    } finally {
      setIsAssemblyLoading(false);
    }
  };

  useEffect(() => {
    if (isAssemblyModalOpen) {
      fetchAssemblyData();
    }
  }, [isAssemblyModalOpen, selectedFiscalYear]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsAssemblyLoading(true);
    try {
      const { error } = await supabase.from('assembly_categories').insert({
        neighborhood_id: townId,
        type: newCatType,
        name: newCatName.trim(),
        parent_id: newCatParentId ? parseInt(newCatParentId, 10) : null
      });
      if (error) throw error;
      setNewCatName('');
      setNewCatParentId('');
      await fetchAssemblyData();
      alert('科目を追加しました。');
    } catch (err: any) {
      alert('科目の追加に失敗しました: ' + (err.message || String(err)));
    } finally {
      setIsAssemblyLoading(false);
    }
  };

  const handleUpdateCategoryName = async (id: number) => {
    if (!editingCatName.trim()) return;
    setIsAssemblyLoading(true);
    try {
      const { error } = await supabase
        .from('assembly_categories')
        .update({ name: editingCatName.trim() })
        .eq('id', id);
      if (error) throw error;
      setEditingCatId(null);
      setEditingCatName('');
      await fetchAssemblyData();
      alert('科目名を変更しました。');
    } catch (err: any) {
      alert('変更に失敗しました: ' + (err.message || String(err)));
    } finally {
      setIsAssemblyLoading(false);
    }
  };

  const handleDeleteCategory = async (id: number, name: string) => {
    if (!confirm(`科目「${name}」を削除しますか？\n(紐づく予算額や実績明細、および補助科目もすべて連動して削除されます)`)) return;
    setIsAssemblyLoading(true);
    try {
      const { error } = await supabase
        .from('assembly_categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchAssemblyData();
      alert('科目を削除しました。');
    } catch (err: any) {
      alert('削除に失敗しました: ' + (err.message || String(err)));
    } finally {
      setIsAssemblyLoading(false);
    }
  };

  const handleSaveBudgets = async () => {
    setIsAssemblyLoading(true);
    try {
      const upserts = Object.keys(budgetDraft).map((catId: string) => {
        const draftItem = budgetDraft[catId];
        const existing = assemblyBudgets.find((b: any) => String(b.category_id) === catId);
        return {
          id: existing ? existing.id : undefined,
          neighborhood_id: townId,
          fiscal_year: selectedFiscalYear,
          category_id: parseInt(catId, 10),
          budget_amount: draftItem.budget_amount,
          previous_budget_amount: draftItem.previous_budget_amount,
          note: draftItem.note
        };
      });

      const { error } = await supabase
        .from('assembly_budgets')
        .upsert(upserts);
      
      if (error) throw error;
      await fetchAssemblyData();
      alert('予算額を保存しました。');
    } catch (err: any) {
      alert('予算の保存に失敗しました: ' + (err.message || String(err)));
    } finally {
      setIsAssemblyLoading(false);
    }
  };

  const handleSaveSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSettlementCatId || !newSettlementAmount || !newSettlementDate) {
      alert('必要事項を入力してください。');
      return;
    }
    const cat = assemblyCategories.find((c: any) => String(c.id) === newSettlementCatId);
    if (!cat) return;

    if (cat.name === '会費' && cat.type === 'income') {
      alert('「会費」科目の収入決算額は会費管理システムから自動連携されるため、手動明細を追加することはできません。');
      return;
    }

    setIsAssemblyLoading(true);
    let receiptUrl = null;
    try {
      if (newSettlementFile) {
        setIsUploadingReceipt(true);
        const fileExt = newSettlementFile.name.split('.').pop();
        const fileName = `receipt_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('attachments')
          .upload(fileName, newSettlementFile);
        
        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);
        if (publicData) {
          receiptUrl = publicData.publicUrl;
        }
      }

      const { error } = await supabase.from('assembly_settlements').insert({
        neighborhood_id: townId,
        fiscal_year: selectedFiscalYear,
        category_id: parseInt(newSettlementCatId, 10),
        amount: parseInt(newSettlementAmount, 10) || 0,
        paid_date: newSettlementDate,
        description: newSettlementDesc.trim(),
        receipt_url: receiptUrl
      });

      if (error) throw error;

      setNewSettlementAmount('');
      setNewSettlementDesc('');
      setNewSettlementFile(null);
      const fileInput = document.getElementById('receiptFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await fetchAssemblyData();
      alert('実績明細を追加しました。');
    } catch (err: any) {
      alert('明細の追加に失敗しました: ' + (err.message || String(err)));
    } finally {
      setIsAssemblyLoading(false);
      setIsUploadingReceipt(false);
    }
  };

  const handleDeleteSettlement = async (id: number) => {
    if (!confirm('この明細データを削除しますか？')) return;
    setIsAssemblyLoading(true);
    try {
      const { error } = await supabase
        .from('assembly_settlements')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchAssemblyData();
      alert('明細データを削除しました。');
    } catch (err: any) {
      alert('削除に失敗しました: ' + (err.message || String(err)));
    } finally {
      setIsAssemblyLoading(false);
    }
  };

  const handlePrintBudget = (year: number, townName: string, categories: any[], budgets: any[]) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('ポップアップブロックが有効になっているため、印刷用画面を開けません。');
      return;
    }

    const incomeList = categories.filter((c: any) => c.type === 'income');
    const expenseList = categories.filter((c: any) => c.type === 'expense');

    const getBudgetData = (catId: number) => {
      const b = budgets.find((x: any) => x.category_id === catId);
      return {
        current: b ? b.budget_amount : 0,
        prev: b ? b.previous_budget_amount : 0,
        note: b ? (b.note || '') : ''
      };
    };

    let incomeRowsHtml = '';
    let totalIncomeCurrent = 0;
    let totalIncomePrev = 0;

    const parentIncomes = incomeList.filter((c: any) => !c.parent_id);
    parentIncomes.forEach((parent: any, index: number) => {
      const pData = getBudgetData(parent.id);
      const childs = incomeList.filter((c: any) => c.parent_id === parent.id);
      const diff = pData.current - pData.prev;
      const numLabel = `${index + 1}.${parent.name}`;
      totalIncomeCurrent += pData.current;
      totalIncomePrev += pData.prev;

      incomeRowsHtml += `
        <tr style="font-weight: bold; background-color: rgba(243,244,246,0.5);">
          <td>${numLabel}</td>
          <td class="text-right">${pData.current.toLocaleString()}</td>
          <td class="text-right">${pData.prev.toLocaleString()}</td>
          <td class="text-right">${diff >= 0 ? '+' : ''}${diff.toLocaleString()}</td>
          <td>${pData.note}</td>
        </tr>
      `;

      childs.forEach((child: any) => {
        const cData = getBudgetData(child.id);
        const cDiff = cData.current - cData.prev;
        totalIncomeCurrent += cData.current;
        totalIncomePrev += cData.prev;

        incomeRowsHtml += `
          <tr class="child-row">
            <td style="padding-left: 24px;">└ ${child.name}</td>
            <td class="text-right">${cData.current.toLocaleString()}</td>
            <td class="text-right">${cData.prev.toLocaleString()}</td>
            <td class="text-right">${cDiff >= 0 ? '+' : ''}${cDiff.toLocaleString()}</td>
            <td>${cData.note}</td>
          </tr>
        `;
      });
    });

    let expenseRowsHtml = '';
    let totalExpenseCurrent = 0;
    let totalExpensePrev = 0;

    const parentExpenses = expenseList.filter((c: any) => !c.parent_id);
    parentExpenses.forEach((parent: any, index: number) => {
      const pData = getBudgetData(parent.id);
      const childs = expenseList.filter((c: any) => c.parent_id === parent.id);
      const diff = pData.current - pData.prev;
      const numLabel = `${index + 1}.${parent.name}`;
      totalExpenseCurrent += pData.current;
      totalExpensePrev += pData.prev;

      expenseRowsHtml += `
        <tr style="font-weight: bold; background-color: rgba(243,244,246,0.5);">
          <td>${numLabel}</td>
          <td class="text-right">${pData.current.toLocaleString()}</td>
          <td class="text-right">${pData.prev.toLocaleString()}</td>
          <td class="text-right">${diff >= 0 ? '+' : ''}${diff.toLocaleString()}</td>
          <td>${pData.note}</td>
        </tr>
      `;

      childs.forEach((child: any) => {
        const cData = getBudgetData(child.id);
        const cDiff = cData.current - cData.prev;
        totalExpenseCurrent += cData.current;
        totalExpensePrev += cData.prev;

        expenseRowsHtml += `
          <tr class="child-row">
            <td style="padding-left: 24px;">└ ${child.name}</td>
            <td class="text-right">${cData.current.toLocaleString()}</td>
            <td class="text-right">${cData.prev.toLocaleString()}</td>
            <td class="text-right">${cDiff >= 0 ? '+' : ''}${cDiff.toLocaleString()}</td>
            <td>${cData.note}</td>
          </tr>
        `;
      });
    });

    const incomeDiff = totalIncomeCurrent - totalIncomePrev;
    const expenseDiff = totalExpenseCurrent - totalExpensePrev;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>予算書_${year}年度_${townName}</title>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap');
          body {
            font-family: 'Noto Sans JP', sans-serif;
            padding: 40px;
            color: #333;
            background-color: #fff;
          }
          h1 {
            text-align: center;
            font-size: 24px;
            font-weight: 900;
            margin-bottom: 30px;
          }
          .meta-info {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 40px;
          }
          th, td {
            border: 1px solid #333;
            padding: 8px 10px;
            text-align: left;
          }
          th {
            background-color: #f3f4f6;
            font-weight: bold;
            text-align: center;
          }
          .text-right {
            text-align: right;
          }
          .section-title {
            font-size: 16px;
            font-weight: 900;
            margin-bottom: 8px;
            border-left: 4px solid #333;
            padding-left: 10px;
          }
          .child-row {
            color: #4b5563;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <h1>【 令和${year}年度 ${townName} 予算書（案） 】</h1>
        
        <div class="section-title">【 収 入 】</div>
        <div class="meta-info">
          <span>（単位：円）</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">科 目</th>
              <th style="width: 18%;">本年度予算</th>
              <th style="width: 18%;">前年度予算</th>
              <th style="width: 15%;">増 減</th>
              <th>内 訳 / 備 考</th>
            </tr>
          </thead>
          <tbody>
            ${incomeRowsHtml}
            <tr style="font-weight: bold; background-color: #e5e7eb;">
              <td>合 計</td>
              <td class="text-right">${totalIncomeCurrent.toLocaleString()}</td>
              <td class="text-right">${totalIncomePrev.toLocaleString()}</td>
              <td class="text-right">${incomeDiff >= 0 ? '+' : ''}${incomeDiff.toLocaleString()}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">【 支 出 】</div>
        <div class="meta-info">
          <span>（単位：円）</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">科 目</th>
              <th style="width: 18%;">本年度予算</th>
              <th style="width: 18%;">前年度予算</th>
              <th style="width: 15%;">増 減</th>
              <th>内 訳 / 備 考</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRowsHtml}
            <tr style="font-weight: bold; background-color: #e5e7eb;">
              <td>合 計</td>
              <td class="text-right">${totalExpenseCurrent.toLocaleString()}</td>
              <td class="text-right">${totalExpensePrev.toLocaleString()}</td>
              <td class="text-right">${expenseDiff >= 0 ? '+' : ''}${expenseDiff.toLocaleString()}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handlePrintSettlement = (year: number, townName: string, categories: any[], budgets: any[], settlements: any[], feeRevenue: number) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('ポップアップブロックが有効になっているため、印刷用画面を開けません。');
      return;
    }

    const incomeList = categories.filter((c: any) => c.type === 'income');
    const expenseList = categories.filter((c: any) => c.type === 'expense');

    const getBudgetAmount = (catId: number) => {
      const b = budgets.find((x: any) => x.category_id === catId);
      return b ? b.budget_amount : 0;
    };

    const getSettlementData = (catId: number, catName: string, type: 'income'|'expense') => {
      const budget = getBudgetAmount(catId);
      let actual = 0;
      let note = '';

      if (type === 'income' && catName === '会費') {
        actual = feeRevenue;
        note = `会費管理システムより自動連携`;
      } else {
        const matchingSettlements = settlements.filter((s: any) => s.category_id === catId);
        actual = matchingSettlements.reduce((sum: number, s: any) => sum + s.amount, 0);
        note = matchingSettlements.map((s: any) => s.description).filter(Boolean).join(', ');
      }

      const diff = actual - budget;

      return {
        budget,
        actual,
        diff,
        note
      };
    };

    let incomeRowsHtml = '';
    let totalIncomeBudget = 0;
    let totalIncomeActual = 0;

    const parentIncomes = incomeList.filter((c: any) => !c.parent_id);
    parentIncomes.forEach((parent: any, index: number) => {
      const data = getSettlementData(parent.id, parent.name, 'income');
      const childs = incomeList.filter((c: any) => c.parent_id === parent.id);
      
      const numLabel = `${index + 1}.${parent.name}`;
      totalIncomeBudget += data.budget;
      totalIncomeActual += data.actual;

      incomeRowsHtml += `
        <tr style="font-weight: bold; background-color: rgba(243,244,246,0.5);">
          <td>${numLabel}</td>
          <td class="text-right">${data.budget.toLocaleString()}</td>
          <td class="text-right">${data.actual.toLocaleString()}</td>
          <td class="text-right">${data.diff >= 0 ? '+' : ''}${data.diff.toLocaleString()}</td>
          <td>${data.note}</td>
        </tr>
      `;

      childs.forEach((child: any) => {
        const cData = getSettlementData(child.id, child.name, 'income');
        totalIncomeBudget += cData.budget;
        totalIncomeActual += cData.actual;

        incomeRowsHtml += `
          <tr class="child-row">
            <td style="padding-left: 24px;">└ ${child.name}</td>
            <td class="text-right">${cData.budget.toLocaleString()}</td>
            <td class="text-right">${cData.actual.toLocaleString()}</td>
            <td class="text-right">${cData.diff >= 0 ? '+' : ''}${cData.diff.toLocaleString()}</td>
            <td>${cData.note}</td>
          </tr>
        `;
      });
    });

    let expenseRowsHtml = '';
    let totalExpenseBudget = 0;
    let totalExpenseActual = 0;

    const parentExpenses = expenseList.filter((c: any) => !c.parent_id);
    parentExpenses.forEach((parent: any, index: number) => {
      const data = getSettlementData(parent.id, parent.name, 'expense');
      const childs = expenseList.filter((c: any) => c.parent_id === parent.id);
      
      const numLabel = `${index + 1}.${parent.name}`;
      totalExpenseBudget += data.budget;
      totalExpenseActual += data.actual;

      expenseRowsHtml += `
        <tr style="font-weight: bold; background-color: rgba(243,244,246,0.5);">
          <td>${numLabel}</td>
          <td class="text-right">${data.budget.toLocaleString()}</td>
          <td class="text-right">${data.actual.toLocaleString()}</td>
          <td class="text-right">${data.diff >= 0 ? '+' : ''}${data.diff.toLocaleString()}</td>
          <td>${data.note}</td>
        </tr>
      `;

      childs.forEach((child: any) => {
        const cData = getSettlementData(child.id, child.name, 'expense');
        totalExpenseBudget += cData.budget;
        totalExpenseActual += cData.actual;

        expenseRowsHtml += `
          <tr class="child-row">
            <td style="padding-left: 24px;">└ ${child.name}</td>
            <td class="text-right">${cData.budget.toLocaleString()}</td>
            <td class="text-right">${cData.actual.toLocaleString()}</td>
            <td class="text-right">${cData.diff >= 0 ? '+' : ''}${cData.diff.toLocaleString()}</td>
            <td>${cData.note}</td>
          </tr>
        `;
      });
    });

    const incomeDiffTotal = totalIncomeActual - totalIncomeBudget;
    const expenseDiffTotal = totalExpenseActual - totalExpenseBudget;
    const balance = totalIncomeActual - totalExpenseActual;
    const todayStr = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>決算書_${year}年度_${townName}</title>
        <meta charset="utf-8">
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&display=swap');
          body {
            font-family: 'Noto Sans JP', sans-serif;
            padding: 40px;
            color: #333;
            background-color: #fff;
          }
          h1 {
            text-align: center;
            font-size: 24px;
            font-weight: 900;
            margin-bottom: 30px;
          }
          .meta-info {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 15px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 30px;
          }
          th, td {
            border: 1px solid #333;
            padding: 8px 10px;
            text-align: left;
          }
          th {
            background-color: #f3f4f6;
            font-weight: bold;
            text-align: center;
          }
          .text-right {
            text-align: right;
          }
          .section-title {
            font-size: 16px;
            font-weight: 900;
            margin-bottom: 8px;
            border-left: 4px solid #333;
            padding-left: 10px;
          }
          .child-row {
            color: #4b5563;
          }
          .summary-box {
            border: 2px solid #333;
            padding: 15px;
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 30px;
            background-color: #f9fafb;
          }
          .signature-box {
            text-align: right;
            margin-top: 40px;
            font-size: 14px;
            font-weight: bold;
          }
          @media print {
            body {
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <h1>【 令和${year}年度 ${townName} 決算書（案） 】</h1>
        
        <div class="section-title">【 収 入 】</div>
        <div class="meta-info">
          <span>（単位：円）</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">科 目</th>
              <th style="width: 18%;">予算額</th>
              <th style="width: 18%;">決算額</th>
              <th style="width: 15%;">増 減</th>
              <th>内 訳 / 備 考</th>
            </tr>
          </thead>
          <tbody>
            ${incomeRowsHtml}
            <tr style="font-weight: bold; background-color: #e5e7eb;">
              <td>合 計</td>
              <td class="text-right">${totalIncomeBudget.toLocaleString()}</td>
              <td class="text-right">${totalIncomeActual.toLocaleString()}</td>
              <td class="text-right">${incomeDiffTotal >= 0 ? '+' : ''}${incomeDiffTotal.toLocaleString()}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">【 支 出 】</div>
        <div class="meta-info">
          <span>（単位：円）</span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 25%;">科 目</th>
              <th style="width: 18%;">予算額</th>
              <th style="width: 18%;">決算額</th>
              <th style="width: 15%;">増 減</th>
              <th>内 訳 / 備 考</th>
            </tr>
          </thead>
          <tbody>
            ${expenseRowsHtml}
            <tr style="font-weight: bold; background-color: #e5e7eb;">
              <td>合 計</td>
              <td class="text-right">${totalExpenseBudget.toLocaleString()}</td>
              <td class="text-right">${totalExpenseActual.toLocaleString()}</td>
              <td class="text-right">${expenseDiffTotal >= 0 ? '+' : ''}${expenseDiffTotal.toLocaleString()}</td>
              <td></td>
            </tr>
          </tbody>
        </table>

        <div class="summary-box">
          収入総額 ${totalIncomeActual.toLocaleString()} 円 － 支出総額 ${totalExpenseActual.toLocaleString()} 円 ＝ 差引 ${balance.toLocaleString()} 円<br>
          <span style="font-weight: normal; font-size: 12px; margin-top: 5px; display: inline-block;">
            ※ 差引残高 ${balance.toLocaleString()} 円は、翌年度に繰越します。
          </span>
        </div>

        <div class="signature-box">
          <div>${todayStr}</div>
          <div style="margin-top: 20px;">${townName}自治会 会長 __________________ 印</div>
        </div>
        
        <script>
          window.onload = function() {
            setTimeout(function() { window.print(); }, 300);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportBudgetCSV = (year: number, categories: any[], budgets: any[]) => {
    const csvHeader = "会計期,区分,科目,本年度予算額,前年度予算額,増減,内訳/備考\n";
    const incomeList = categories.filter((c: any) => c.type === 'income');
    const expenseList = categories.filter((c: any) => c.type === 'expense');

    const getBudgetData = (catId: number) => {
      const b = budgets.find((x: any) => x.category_id === catId);
      return {
        current: b ? b.budget_amount : 0,
        prev: b ? b.previous_budget_amount : 0,
        note: b ? (b.note || '') : ''
      };
    };

    const rows: string[] = [];

    const parentIncomes = incomeList.filter((c: any) => !c.parent_id);
    parentIncomes.forEach((parent: any) => {
      const d = getBudgetData(parent.id);
      rows.push(`"${year}年度","収入","${parent.name}",${d.current},${d.prev},${d.current - d.prev},"${d.note.replace(/"/g, '""')}"`);
      const childs = incomeList.filter((c: any) => c.parent_id === parent.id);
      childs.forEach((child: any) => {
        const cd = getBudgetData(child.id);
        rows.push(`"${year}年度","収入","└ ${child.name}",${cd.current},${cd.prev},${cd.current - cd.prev},"${cd.note.replace(/"/g, '""')}"`);
      });
    });

    const parentExpenses = expenseList.filter((c: any) => !c.parent_id);
    parentExpenses.forEach((parent: any) => {
      const d = getBudgetData(parent.id);
      rows.push(`"${year}年度","支出","${parent.name}",${d.current},${d.prev},${d.current - d.prev},"${d.note.replace(/"/g, '""')}"`);
      const childs = expenseList.filter((c: any) => c.parent_id === parent.id);
      childs.forEach((child: any) => {
        const cd = getBudgetData(child.id);
        rows.push(`"${year}年度","支出","└ ${child.name}",${cd.current},${cd.prev},${cd.current - cd.prev},"${cd.note.replace(/"/g, '""')}"`);
      });
    });

    const csvContent = csvHeader + rows.join("\n");
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${townName}_予算書_${year}年度.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSettlementCSV = (year: number, categories: any[], budgets: any[], settlements: any[], feeRevenue: number) => {
    const csvHeader = "会計期,区分,科目,予算額,決算額,増減,内訳/備考\n";
    const incomeList = categories.filter((c: any) => c.type === 'income');
    const expenseList = categories.filter((c: any) => c.type === 'expense');

    const getBudgetAmount = (catId: number) => {
      const b = budgets.find((x: any) => x.category_id === catId);
      return b ? b.budget_amount : 0;
    };

    const getSettlementData = (catId: number, catName: string, type: 'income'|'expense') => {
      const budget = getBudgetAmount(catId);
      let actual = 0;
      let note = '';

      if (type === 'income' && catName === '会費') {
        actual = feeRevenue;
        note = `会費管理システムより自動連携`;
      } else {
        const matchingSettlements = settlements.filter((s: any) => s.category_id === catId);
        actual = matchingSettlements.reduce((sum: number, s: any) => sum + s.amount, 0);
        note = matchingSettlements.map((s: any) => s.description).filter(Boolean).join(', ');
      }

      const diff = actual - budget;

      return {
        budget,
        actual,
        diff,
        note
      };
    };

    const rows: string[] = [];

    const parentIncomes = incomeList.filter((c: any) => !c.parent_id);
    parentIncomes.forEach((parent: any) => {
      const d = getSettlementData(parent.id, parent.name, 'income');
      rows.push(`"${year}年度","収入","${parent.name}",${d.budget},${d.actual},${d.diff},"${d.note.replace(/"/g, '""')}"`);
      const childs = incomeList.filter((c: any) => c.parent_id === parent.id);
      childs.forEach((child: any) => {
        const cd = getSettlementData(child.id, child.name, 'income');
        rows.push(`"${year}年度","収入","└ ${child.name}",${cd.budget},${cd.actual},${cd.diff},"${cd.note.replace(/"/g, '""')}"`);
      });
    });

    const parentExpenses = expenseList.filter((c: any) => !c.parent_id);
    parentExpenses.forEach((parent: any) => {
      const d = getSettlementData(parent.id, parent.name, 'expense');
      rows.push(`"${year}年度","支出","${parent.name}",${d.budget},${d.actual},${d.diff},"${d.note.replace(/"/g, '""')}"`);
      const childs = expenseList.filter((c: any) => c.parent_id === parent.id);
      childs.forEach((child: any) => {
        const cd = getSettlementData(child.id, child.name, 'expense');
        rows.push(`"${year}年度","支出","└ ${child.name}",${cd.budget},${cd.actual},${cd.diff},"${cd.note.replace(/"/g, '""')}"`);
      });
    });

    const csvContent = csvHeader + rows.join("\n");
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${townName}_決算書_${year}年度.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
