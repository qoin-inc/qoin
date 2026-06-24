// assembly_backend.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/router';
import AssemblyUI from './assembly_ui';

export default function AssemblyBackend() {
  // --- State & functions ---
  const router = useRouter();
  const townId = Number(router.query.townId);
  const townName = typeof router.query.townName === 'string' ? router.query.townName : '';
  const [isAssemblyModalOpen, setIsAssemblyModalOpen] = useState(false);
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<number>(new Date().getFullYear());
  const [assemblySubTab, setAssemblySubTab] = useState<'category'|'budget'|'settlement_input'|'settlement_view'>('category');
  const [assemblyCategories, setAssemblyCategories] = useState<any[]>([]);
  const [assemblyBudgets, setAssemblyBudgets] = useState<any[]>([]);
  const [assemblySettlements, setAssemblySettlements] = useState<any[]>([]);
  const [selectedSettlementMonth, setSelectedSettlementMonth] = useState<string>('all');
  const [isAssemblyLoading, setIsAssemblyLoading] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatParentId, setNewCatParentId] = useState<string>('');
  const [newCatType, setNewCatType] = useState<'income'|'expense'>('income');
  const [editingCatId, setEditingCatId] = useState<number | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [budgetDraft, setBudgetDraft] = useState<Record<string, { budget_amount: number; previous_budget_amount: number; note: string }>>({});
  const [newSettlementDate, setNewSettlementDate] = useState(new Date().toISOString().slice(0, 10));
  const [newSettlementType, setNewSettlementType] = useState<'income'|'expense'>('expense');
  const [newSettlementCatId, setNewSettlementCatId] = useState<string>('');
  const [newSettlementAmount, setNewSettlementAmount] = useState<number>(0);
  const [newSettlementDesc, setNewSettlementDesc] = useState('');
  const [newSettlementFile, setNewSettlementFile] = useState<File | null>(null);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
  const [assemblyFeeRevenue, setAssemblyFeeRevenue] = useState(0);

  const fetchAssemblyData = async () => {
    setIsAssemblyLoading(true);
    try {
      // 1. 科目マスタ取得
      let { data: cats, error: catErr } = await supabase
        .from('assembly_categories')
        .select('*')
        .eq('neighborhood_id', townId)
        .order('id', { ascending: true });
      if (catErr) throw catErr;

      // 初回デフォルト科目生成
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
          { neighborhood_id: townId, type: 'expense', name: '予備費' },
        ];
        const { error: insErr } = await supabase.from('assembly_categories').insert(defaultCats);
        if (insErr) throw insErr;
        const { data: refetchedCats, error: refetchErr } = await supabase
          .from('assembly_categories')
          .select('*')
          .eq('neighborhood_id', townId)
          .order('id', { ascending: true });
        if (refetchErr) throw refetchErr;
        cats = refetchedCats;
      }
      setAssemblyCategories(cats || []);

      // デフォルト科目選択
      if (cats && cats.length > 0) {
        const firstExpense = cats.find((c: any) => c.type === 'expense');
        if (firstExpense) setNewSettlementCatId(String(firstExpense.id));
      }

      // 2. 予算取得
      const { data: budgets, error: budErr } = await supabase
        .from('assembly_budgets')
        .select('*')
        .eq('neighborhood_id', townId)
        .eq('fiscal_year', selectedFiscalYear);
      if (budErr) throw budErr;
      setAssemblyBudgets(budgets || []);

      // 予算下書き
      const draft: Record<string, { budget_amount: number; previous_budget_amount: number; note: string }> = {};
      cats?.forEach((cat: any) => {
        const existing = budgets?.find((b: any) => b.category_id === cat.id);
        draft[String(cat.id)] = {
          budget_amount: existing ? existing.budget_amount : 0,
          previous_budget_amount: existing ? existing.previous_budget_amount : 0,
          note: existing ? (existing.note || '') : '',
        };
      });
      setBudgetDraft(draft);

      // 3. 決算取得
      const { data: settlements, error: setErr } = await supabase
        .from('assembly_settlements')
        .select('*')
        .eq('neighborhood_id', townId)
        .eq('fiscal_year', selectedFiscalYear)
        .order('paid_date', { ascending: true });
      if (setErr) throw setErr;
      setAssemblySettlements(settlements || []);

      // 4. 会費自動連携
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

  // ---------- Handler Functions ----------
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName) return alert('科目名を入力してください');
    const payload = {
      neighborhood_id: townId,
      type: newCatType,
      name: newCatName,
      parent_id: newCatParentId || null,
    };
    const { error } = await supabase.from('assembly_categories').insert([payload]);
    if (error) {
      console.error(error);
      alert('科目の追加に失敗しました');
    } else {
      // Refresh categories and other data
      fetchAssemblyData();
      setNewCatName('');
      setNewCatParentId('');
    }
  };

  const handleUpdateCategoryName = async (id: number, name: string) => {
    const { error } = await supabase
      .from('assembly_categories')
      .update({ name })
      .eq('id', id);
    if (error) {
      console.error(error);
      alert('科目名の更新に失敗しました');
    } else {
      fetchAssemblyData();
    }
  };

  const handleDeleteCategory = async (id: number, name?: string) => {
    if (!confirm('この科目と関連データを本当に削除しますか？')) return;
    const { error } = await supabase.from('assembly_categories').delete().eq('id', id);
    if (error) {
      console.error(error);
      alert('科目の削除に失敗しました');
    } else {
      fetchAssemblyData();
    }
  };

  const handlePrintBudget = (year: number, townName: string, categories: any[], budgets: any[]) => {
    window.print();
  };

  const handleExportBudgetCSV = (year: number, categories: any[], budgets: any[]) => {
    // existing code unchanged
    const rows = budgets.map((b: any) => {
      const cat = categories.find((c: any) => c.id === b.category_id);
      return {
        科目: cat?.name || '',
        種別: cat?.type || '',
        予算額: b.budget_amount,
        前年予算: b.previous_budget_amount,
        メモ: b.note || '',
      };
    });
    const csvHeader = Object.keys(rows[0] || {}).join(',');
    const csvRows = rows.map(r => Object.values(r).join(','));
    const csvContent = [csvHeader, ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `budget_${year}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

// Save settlement handler
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
    let receiptUrl: string | null = null;
    try {
      if (newSettlementFile) {
        setIsUploadingReceipt(true);
        const fileExt = newSettlementFile.name.split('.').pop();
        const fileName = `receipt_${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('attachments').upload(fileName, newSettlementFile);
        if (uploadError) throw uploadError;
        const { data: publicData } = supabase.storage.from('attachments').getPublicUrl(fileName);
        if (publicData) receiptUrl = publicData.publicUrl;
      }
      const { error } = await supabase.from('assembly_settlements').insert({
        neighborhood_id: townId,
        fiscal_year: selectedFiscalYear,
        category_id: parseInt(newSettlementCatId, 10),
        amount: String(newSettlementAmount),
        paid_date: newSettlementDate,
        description: newSettlementDesc.trim(),
        receipt_url: receiptUrl,
      });
      if (error) throw error;
      setNewSettlementAmount(0);
      setNewSettlementDesc('');
      setNewSettlementFile(null);
      const fileInput = document.getElementById('receiptFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      await fetchAssemblyData();
    } catch (err: any) {
      alert('明細の追加に失敗しました: ' + (err.message || String(err)));
    } finally {
      setIsAssemblyLoading(false);
      setIsUploadingReceipt(false);
    }
  };

  const handleSaveBudgets = async () => {
    setIsAssemblyLoading(true);
    try {
      const upserts = Object.keys(budgetDraft).map((catId) => {
        const draftItem = budgetDraft[catId];
        const existing = assemblyBudgets.find((b) => String(b.category_id) === catId);
        const item: any = {
          neighborhood_id: townId,
          fiscal_year: selectedFiscalYear,
          category_id: parseInt(catId, 10),
          budget_amount: draftItem.budget_amount,
          previous_budget_amount: draftItem.previous_budget_amount,
          note: draftItem.note,
        };
        if (existing) {
          item.id = existing.id;
        }
        return item;
      });
      const { error } = await supabase.from('assembly_budgets').upsert(upserts, { onConflict: 'id' });
      if (error) throw error;
      await fetchAssemblyData();
      alert('予算が保存されました');
    } catch (err: any) {
      console.error(err);
      alert('予算保存に失敗しました: ' + (err.message || String(err)));
    } finally {
      setIsAssemblyLoading(false);
    }
  };

  const handleDeleteSettlement = async (id: number) => {
    setIsAssemblyLoading(true);
    try {
      const { error } = await supabase.from('assembly_settlements').delete().eq('id', id);
      if (error) throw error;
      await fetchAssemblyData();
    } catch (err: any) {
      console.error(err);
      alert('決算削除に失敗しました: ' + (err.message || String(err)));
    } finally {
      setIsAssemblyLoading(false);
    }
  };

  const handlePrintSettlement = (year: number, townName: string, categories: any[], budgets: any[], settlements: any[], feeRevenue: number) => {
    // Simple placeholder: alert user; replace with proper print logic if needed
    alert('印刷機能は未実装です');
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
      return { budget, actual, diff, note };
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

  return (
    <AssemblyUI
      handlePrintSettlement={handlePrintSettlement}
      handleExportSettlementCSV={handleExportSettlementCSV}
      townName={townName}
      isAssemblyModalOpen={isAssemblyModalOpen}
      handleDeleteSettlement={handleDeleteSettlement}
      setIsAssemblyModalOpen={setIsAssemblyModalOpen}
      selectedFiscalYear={selectedFiscalYear}
      setSelectedFiscalYear={setSelectedFiscalYear}
      assemblySubTab={assemblySubTab}
      setAssemblySubTab={setAssemblySubTab}
      assemblyCategories={assemblyCategories}
      setAssemblyCategories={setAssemblyCategories}
      assemblyBudgets={assemblyBudgets}
      setAssemblyBudgets={setAssemblyBudgets}
      assemblySettlements={assemblySettlements}
      setAssemblySettlements={setAssemblySettlements}
      selectedSettlementMonth={selectedSettlementMonth}
      setSelectedSettlementMonth={setSelectedSettlementMonth}
      isAssemblyLoading={isAssemblyLoading}
      setIsAssemblyLoading={setIsAssemblyLoading}
      newCatName={newCatName}
      setNewCatName={setNewCatName}
      newCatParentId={newCatParentId}
      setNewCatParentId={setNewCatParentId}
      newCatType={newCatType}
      setNewCatType={setNewCatType}
      editingCatId={editingCatId}
      setEditingCatId={setEditingCatId}
      editingCatName={editingCatName}
      setEditingCatName={setEditingCatName}
      budgetDraft={budgetDraft}
      setBudgetDraft={setBudgetDraft}
      newSettlementDate={newSettlementDate}
      setNewSettlementDate={setNewSettlementDate}
      newSettlementType={newSettlementType}
      setNewSettlementType={setNewSettlementType}
      newSettlementCatId={newSettlementCatId}
      setNewSettlementCatId={setNewSettlementCatId}
      newSettlementAmount={newSettlementAmount}
      setNewSettlementAmount={setNewSettlementAmount}
      newSettlementDesc={newSettlementDesc}
      setNewSettlementDesc={setNewSettlementDesc}
      newSettlementFile={newSettlementFile}
      setNewSettlementFile={setNewSettlementFile}
      isUploadingReceipt={isUploadingReceipt}
      setIsUploadingReceipt={setIsUploadingReceipt}
      assemblyFeeRevenue={assemblyFeeRevenue}
      setAssemblyFeeRevenue={setAssemblyFeeRevenue}
      handleAddCategory={handleAddCategory}
      handleUpdateCategoryName={handleUpdateCategoryName}
      handleDeleteCategory={handleDeleteCategory}
      handlePrintBudget={handlePrintBudget}
      handleExportBudgetCSV={handleExportBudgetCSV}
      handleSaveSettlement={handleSaveSettlement}
      handleSaveBudgets={handleSaveBudgets}
    />
  );
}
