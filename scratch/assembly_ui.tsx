              {/* -------------------- 総会（予算書・決算書）管理モーダル -------------------- */}
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
                    <div className="p-6 md:p-8 border-b border-gray-200 shrink-0 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-50 text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0">
                          <i className="fas fa-file-invoice-dollar"></i>
                        </div>
                        <div>
                          <h3 className="font-black text-slate-800 text-base">総会 予算書・決算書管理</h3>
                          <p className="text-xs text-slate-500 font-semibold">年度ごとの予算編成、決算集計、および配布用書類の作成が行えます。</p>
                        </div>
                      </div>
                      
                      {/* 年度選択ドロップダウン */}
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-slate-600 whitespace-nowrap">対象会計年度:</label>
                        <select
                          value={selectedFiscalYear}
                          onChange={(e) => setSelectedFiscalYear(parseInt(e.target.value, 10))}
                          className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          {Array.from({ length: 5 }, (_, i: number) => new Date().getFullYear() - 2 + i).map((y: number) => (
                            <option key={y} value={y}>{y}年度 (令和{y - 2018}年度)</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* モーダルコンテンツ（スクロール可能）領域 */}
                    <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-white">

                    {/* サブタブ切り替え */}
                    <div className="flex border-b border-slate-100 mb-6 overflow-x-auto gap-1">
                      <button
                        onClick={() => setAssemblySubTab('category')}
                        className={`px-4 py-2 text-xs font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
                          assemblySubTab === 'category'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <i className="fas fa-tags mr-1.5"></i>科目・補助科目設定
                      </button>
                      <button
                        onClick={() => setAssemblySubTab('budget')}
                        className={`px-4 py-2 text-xs font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
                          assemblySubTab === 'budget'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <i className="fas fa-calculator mr-1.5"></i>予算書作成
                      </button>
                      <button
                        onClick={() => setAssemblySubTab('settlement_input')}
                        className={`px-4 py-2 text-xs font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
                          assemblySubTab === 'settlement_input'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <i className="fas fa-edit mr-1.5"></i>実績・決算入力
                      </button>
                      <button
                        onClick={() => setAssemblySubTab('settlement_view')}
                        className={`px-4 py-2 text-xs font-bold transition whitespace-nowrap border-b-2 cursor-pointer ${
                          assemblySubTab === 'settlement_view'
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <i className="fas fa-file-alt mr-1.5"></i>決算書作成
                      </button>
                    </div>

                    {isAssemblyLoading && (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                        <p className="text-xs text-slate-500 font-bold">データを読み込み中...</p>
                      </div>
                    )}

                    {!isAssemblyLoading && (
                      <div>
                        {/* サブタブ1: 科目・補助科目設定 */}
                        {assemblySubTab === 'category' && (
                          <div className="space-y-6 animate-fadeIn">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              {/* 科目の追加フォーム */}
                              <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl space-y-4">
                                <h4 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center">
                                  <i className="fas fa-plus-circle text-indigo-600 mr-1.5"></i>科目の新規追加
                                </h4>
                                <form onSubmit={handleAddCategory} className="space-y-4">
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">区 分</label>
                                    <div className="flex gap-4">
                                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                        <input
                                          type="radio"
                                          name="catType"
                                          checked={newCatType === 'income'}
                                          onChange={() => {
                                            setNewCatType('income');
                                            setNewCatParentId('');
                                          }}
                                          className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        収入
                                      </label>
                                      <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                        <input
                                          type="radio"
                                          name="catType"
                                          checked={newCatType === 'expense'}
                                          onChange={() => {
                                            setNewCatType('expense');
                                            setNewCatParentId('');
                                          }}
                                          className="text-indigo-600 focus:ring-indigo-500"
                                        />
                                        支出
                                      </label>
                                    </div>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">親科目 (補助科目の場合のみ選択)</label>
                                    <select
                                      value={newCatParentId}
                                      onChange={(e) => setNewCatParentId(e.target.value)}
                                      className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                      <option value="">-- 親科目として登録 (大科目) --</option>
                                      {assemblyCategories
                                        .filter((c: any) => c.type === newCatType && !c.parent_id)
                                        .map((parent: any) => (
                                          <option key={parent.id} value={parent.id}>{parent.name}</option>
                                        ))
                                      }
                                    </select>
                                  </div>

                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">科目名 / 補助科目名</label>
                                    <input
                                      type="text"
                                      value={newCatName}
                                      onChange={(e) => setNewCatName(e.target.value)}
                                      placeholder="例: 集会所水道代、防犯灯電気代など"
                                      className="w-full bg-white border border-slate-200 text-slate-700 text-xs py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      required
                                    />
                                  </div>

                                  <button
                                    type="submit"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded-lg text-xs shadow-md transition cursor-pointer"
                                  >
                                    追加する
                                  </button>
                                </form>
                              </div>

                              {/* デフォルト科目の注意書き */}
                              <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl flex flex-col justify-between">
                                <div className="space-y-3">
                                  <h4 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center">
                                    <i className="fas fa-info-circle text-indigo-600 mr-1.5"></i>科目設定のルール
                                  </h4>
                                  <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4 font-semibold">
                                    <li>大科目の下に「補助科目」を追加して、さらに細かく予算と決算を集計できます。</li>
                                    <li>科目を削除すると、紐づいている予算額や決算実績明細も<b>すべて削除</b>されます。</li>
                                    <li>収入の「会費」科目はシステム連携用であるため、名前の変更や削除は推奨されません。</li>
                                  </ul>
                                </div>
                                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-[11px] text-indigo-700 font-bold mt-4">
                                  ※ 初回アクセス時に町内会・自治会の標準的な科目が自動設定されています。地域の会計形態に合わせて自由に追加・修正してください。
                                </div>
                              </div>
                            </div>

                            {/* 登録済み科目一覧 */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                              {/* 収入の部 */}
                              <div className="border border-slate-100 p-5 rounded-xl space-y-3">
                                <h4 className="font-bold text-emerald-700 text-sm border-b border-emerald-100 pb-2 flex items-center justify-between">
                                  <span><i className="fas fa-coins mr-1.5"></i>収入科目 一覧</span>
                                  <span className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-bold">INCOME</span>
                                </h4>
                                <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto pr-1">
                                  {assemblyCategories.filter((c: any) => c.type === 'income' && !c.parent_id).map((parent: any) => {
                                    const childs = assemblyCategories.filter((c: any) => c.parent_id === parent.id);
                                    return (
                                      <div key={parent.id} className="py-2 space-y-1">
                                        {/* 親科目表示 */}
                                        {editingCatId === parent.id ? (
                                          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded">
                                            <input
                                              type="text"
                                              value={editingCatName}
                                              onChange={(e) => setEditingCatName(e.target.value)}
                                              className="border border-slate-200 text-xs px-2 py-1 rounded w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                            <button
                                              onClick={() => handleUpdateCategoryName(parent.id)}
                                              className="bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold shrink-0 cursor-pointer"
                                            >
                                              保存
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingCatId(null);
                                                setEditingCatName('');
                                              }}
                                              className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-[10px] font-bold shrink-0 cursor-pointer"
                                            >
                                              取消
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between group py-1.5 px-2 hover:bg-slate-50 rounded transition">
                                            <span className="text-xs font-black text-slate-800">{parent.name}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button
                                                onClick={() => {
                                                  setEditingCatId(parent.id);
                                                  setEditingCatName(parent.name);
                                                }}
                                                className="text-slate-400 hover:text-indigo-600 text-xs p-1 cursor-pointer"
                                                title="編集"
                                              >
                                                <i className="fas fa-edit"></i>
                                              </button>
                                              {parent.name !== '会費' && (
                                                <button
                                                  onClick={() => handleDeleteCategory(parent.id, parent.name)}
                                                  className="text-slate-400 hover:text-rose-600 text-xs p-1 cursor-pointer"
                                                  title="削除"
                                                >
                                                  <i className="fas fa-trash-alt"></i>
                                                </button>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* 子科目 (補助科目) 表示 */}
                                        {childs.map((child: any) => (
                                          <div key={child.id} className="pl-6">
                                            {editingCatId === child.id ? (
                                              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded">
                                                <input
                                                  type="text"
                                                  value={editingCatName}
                                                  onChange={(e) => setEditingCatName(e.target.value)}
                                                  className="border border-slate-200 text-xs px-2 py-1 rounded w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                                <button
                                                  onClick={() => handleUpdateCategoryName(child.id)}
                                                  className="bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold shrink-0 cursor-pointer"
                                                >
                                                  保存
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setEditingCatId(null);
                                                    setEditingCatName('');
                                                  }}
                                                  className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-[10px] font-bold shrink-0 cursor-pointer"
                                                >
                                                  取消
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center justify-between group py-1 px-2 hover:bg-slate-50 rounded transition text-slate-600">
                                                <span className="text-xs font-semibold">└ {child.name}</span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button
                                                    onClick={() => {
                                                      setEditingCatId(child.id);
                                                      setEditingCatName(child.name);
                                                    }}
                                                    className="text-slate-400 hover:text-indigo-600 text-xs p-1 cursor-pointer"
                                                    title="編集"
                                                  >
                                                    <i className="fas fa-edit"></i>
                                                  </button>
                                                  <button
                                                    onClick={() => handleDeleteCategory(child.id, child.name)}
                                                    className="text-slate-400 hover:text-rose-600 text-xs p-1 cursor-pointer"
                                                    title="削除"
                                                  >
                                                    <i className="fas fa-trash-alt"></i>
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 支出の部 */}
                              <div className="border border-slate-100 p-5 rounded-xl space-y-3">
                                <h4 className="font-bold text-rose-700 text-sm border-b border-rose-100 pb-2 flex items-center justify-between">
                                  <span><i className="fas fa-shopping-cart mr-1.5"></i>支出科目 一覧</span>
                                  <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-bold">EXPENSE</span>
                                </h4>
                                <div className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto pr-1">
                                  {assemblyCategories.filter((c: any) => c.type === 'expense' && !c.parent_id).map((parent: any) => {
                                    const childs = assemblyCategories.filter((c: any) => c.parent_id === parent.id);
                                    return (
                                      <div key={parent.id} className="py-2 space-y-1">
                                        {/* 親科目表示 */}
                                        {editingCatId === parent.id ? (
                                          <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded">
                                            <input
                                              type="text"
                                              value={editingCatName}
                                              onChange={(e) => setEditingCatName(e.target.value)}
                                              className="border border-slate-200 text-xs px-2 py-1 rounded w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                            <button
                                              onClick={() => handleUpdateCategoryName(parent.id)}
                                              className="bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold shrink-0 cursor-pointer"
                                            >
                                              保存
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingCatId(null);
                                                setEditingCatName('');
                                              }}
                                              className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-[10px] font-bold shrink-0 cursor-pointer"
                                            >
                                              取消
                                            </button>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between group py-1.5 px-2 hover:bg-slate-50 rounded transition">
                                            <span className="text-xs font-black text-slate-800">{parent.name}</span>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button
                                                onClick={() => {
                                                  setEditingCatId(parent.id);
                                                  setEditingCatName(parent.name);
                                                }}
                                                className="text-slate-400 hover:text-indigo-600 text-xs p-1 cursor-pointer"
                                                title="編集"
                                              >
                                                <i className="fas fa-edit"></i>
                                              </button>
                                              <button
                                                onClick={() => handleDeleteCategory(parent.id, parent.name)}
                                                className="text-slate-400 hover:text-rose-600 text-xs p-1 cursor-pointer"
                                                title="削除"
                                              >
                                                <i className="fas fa-trash-alt"></i>
                                              </button>
                                            </div>
                                          </div>
                                        )}

                                        {/* 子科目 (補助科目) 表示 */}
                                        {childs.map((child: any) => (
                                          <div key={child.id} className="pl-6">
                                            {editingCatId === child.id ? (
                                              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded">
                                                <input
                                                  type="text"
                                                  value={editingCatName}
                                                  onChange={(e) => setEditingCatName(e.target.value)}
                                                  className="border border-slate-200 text-xs px-2 py-1 rounded w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                                <button
                                                  onClick={() => handleUpdateCategoryName(child.id)}
                                                  className="bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold shrink-0 cursor-pointer"
                                                >
                                                  保存
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setEditingCatId(null);
                                                    setEditingCatName('');
                                                  }}
                                                  className="bg-slate-200 text-slate-600 px-2 py-1 rounded text-[10px] font-bold shrink-0 cursor-pointer"
                                                >
                                                  取消
                                                </button>
                                              </div>
                                            ) : (
                                              <div className="flex items-center justify-between group py-1 px-2 hover:bg-slate-50 rounded transition text-slate-600">
                                                <span className="text-xs font-semibold">└ {child.name}</span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <button
                                                    onClick={() => {
                                                      setEditingCatId(child.id);
                                                      setEditingCatName(child.name);
                                                    }}
                                                    className="text-slate-400 hover:text-indigo-600 text-xs p-1 cursor-pointer"
                                                    title="編集"
                                                  >
                                                    <i className="fas fa-edit"></i>
                                                  </button>
                                                  <button
                                                    onClick={() => handleDeleteCategory(child.id, child.name)}
                                                    className="text-slate-400 hover:text-rose-600 text-xs p-1 cursor-pointer"
                                                    title="削除"
                                                  >
                                                    <i className="fas fa-trash-alt"></i>
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* サブタブ2: 予算書作成 */}
                        {assemblySubTab === 'budget' && (
                          <div className="space-y-6 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-slate-800 text-sm flex items-center">
                                <i className="fas fa-calculator text-indigo-600 mr-1.5"></i>予算額の登録・編集
                              </h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handlePrintBudget(selectedFiscalYear, settingsData?.town_name || '', assemblyCategories, assemblyBudgets)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-md transition cursor-pointer flex items-center gap-1"
                                >
                                  <i className="fas fa-print"></i>印刷 (PDF)
                                </button>
                                <button
                                  onClick={() => handleExportBudgetCSV(selectedFiscalYear, assemblyCategories, assemblyBudgets)}
                                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                                >
                                  <i className="fas fa-file-csv text-emerald-600"></i>CSV出力
                                </button>
                              </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 overflow-x-auto">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                                    <th className="py-2.5 px-3 w-[25%]">科 目</th>
                                    <th className="py-2.5 px-3 w-[22%] text-right">本年度予算額 (円)</th>
                                    <th className="py-2.5 px-3 w-[22%] text-right">前年度予算額 (円)</th>
                                    <th className="py-2.5 px-3 w-[12%] text-right">増減 (円)</th>
                                    <th className="py-2.5 px-3">内訳 / 備考</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* 収入の部 */}
                                  <tr className="bg-emerald-50/50 font-bold text-emerald-800 border-b border-slate-100">
                                    <td colSpan={5} className="py-2 px-3"><i className="fas fa-coins mr-1"></i>収入の部</td>
                                  </tr>
                                  {assemblyCategories.filter((c: any) => c.type === 'income' && !c.parent_id).map((parent: any) => {
                                    const childs = assemblyCategories.filter((c: any) => c.parent_id === parent.id);
                                    const pDraft = budgetDraft[parent.id] || { budget_amount: 0, previous_budget_amount: 0, note: '' };
                                    const pDiff = pDraft.budget_amount - pDraft.previous_budget_amount;

                                    return (
                                      <React.Fragment key={parent.id}>
                                        <tr className="border-b border-slate-100 font-semibold hover:bg-slate-50/30">
                                          <td className="py-2.5 px-3 pl-5 text-slate-800">{parent.name}</td>
                                          <td className="py-2 px-3 text-right">
                                            <input
                                              type="number"
                                              value={pDraft.budget_amount === 0 ? '' : pDraft.budget_amount}
                                              onChange={(e) => setBudgetDraft((prev: any) => ({
                                                ...prev,
                                                [parent.id]: {
                                                  ...prev[parent.id],
                                                  budget_amount: parseInt(e.target.value, 10) || 0
                                                }
                                              }))}
                                              placeholder="0"
                                              className="border border-slate-200 text-right text-xs py-1 px-2 rounded-md w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                            />
                                          </td>
                                          <td className="py-2 px-3 text-right">
                                            <input
                                              type="number"
                                              value={pDraft.previous_budget_amount === 0 ? '' : pDraft.previous_budget_amount}
                                              onChange={(e) => setBudgetDraft((prev: any) => ({
                                                ...prev,
                                                [parent.id]: {
                                                  ...prev[parent.id],
                                                  previous_budget_amount: parseInt(e.target.value, 10) || 0
                                                }
                                              }))}
                                              placeholder="0"
                                              className="border border-slate-200 text-right text-xs py-1 px-2 rounded-md w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                            />
                                          </td>
                                          <td className={`py-2 px-3 text-right font-mono font-bold ${pDiff > 0 ? 'text-emerald-600' : pDiff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                            {pDiff >= 0 ? '+' : ''}{pDiff.toLocaleString()}
                                          </td>
                                          <td className="py-2 px-3">
                                            <input
                                              type="text"
                                              value={pDraft.note || ''}
                                              onChange={(e) => setBudgetDraft((prev: any) => ({
                                                ...prev,
                                                [parent.id]: {
                                                  ...prev[parent.id],
                                                  note: e.target.value
                                                }
                                              }))}
                                              placeholder="内訳やメモを入力"
                                              className="border border-slate-200 text-xs py-1 px-2 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                          </td>
                                        </tr>

                                        {childs.map((child: any) => {
                                          const cDraft = budgetDraft[child.id] || { budget_amount: 0, previous_budget_amount: 0, note: '' };
                                          const cDiff = cDraft.budget_amount - cDraft.previous_budget_amount;
                                          return (
                                            <tr key={child.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-slate-600">
                                              <td className="py-2.5 px-3 pl-8">└ {child.name}</td>
                                              <td className="py-2 px-3 text-right">
                                                <input
                                                  type="number"
                                                  value={cDraft.budget_amount === 0 ? '' : cDraft.budget_amount}
                                                  onChange={(e) => setBudgetDraft((prev: any) => ({
                                                    ...prev,
                                                    [child.id]: {
                                                      ...prev[child.id],
                                                      budget_amount: parseInt(e.target.value, 10) || 0
                                                    }
                                                  }))}
                                                  placeholder="0"
                                                  className="border border-slate-200 text-right text-xs py-1 px-2 rounded-md w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                                />
                                              </td>
                                              <td className="py-2 px-3 text-right">
                                                <input
                                                  type="number"
                                                  value={cDraft.previous_budget_amount === 0 ? '' : cDraft.previous_budget_amount}
                                                  onChange={(e) => setBudgetDraft((prev: any) => ({
                                                    ...prev,
                                                    [child.id]: {
                                                      ...prev[child.id],
                                                      previous_budget_amount: parseInt(e.target.value, 10) || 0
                                                    }
                                                  }))}
                                                  placeholder="0"
                                                  className="border border-slate-200 text-right text-xs py-1 px-2 rounded-md w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                                />
                                              </td>
                                              <td className={`py-2 px-3 text-right font-mono font-bold ${cDiff > 0 ? 'text-emerald-600' : cDiff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                                {cDiff >= 0 ? '+' : ''}{cDiff.toLocaleString()}
                                              </td>
                                              <td className="py-2 px-3">
                                                <input
                                                  type="text"
                                                  value={cDraft.note || ''}
                                                  onChange={(e) => setBudgetDraft((prev: any) => ({
                                                    ...prev,
                                                    [child.id]: {
                                                      ...prev[child.id],
                                                      note: e.target.value
                                                    }
                                                  }))}
                                                  placeholder="内訳やメモを入力"
                                                  className="border border-slate-200 text-xs py-1 px-2 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </React.Fragment>
                                    );
                                  })}

                                  {/* 支出の部 */}
                                  <tr className="bg-rose-50/50 font-bold text-rose-800 border-b border-slate-100">
                                    <td colSpan={5} className="py-2 px-3"><i className="fas fa-shopping-cart mr-1"></i>支出の部</td>
                                  </tr>
                                  {assemblyCategories.filter((c: any) => c.type === 'expense' && !c.parent_id).map((parent: any) => {
                                    const childs = assemblyCategories.filter((c: any) => c.parent_id === parent.id);
                                    const pDraft = budgetDraft[parent.id] || { budget_amount: 0, previous_budget_amount: 0, note: '' };
                                    const pDiff = pDraft.budget_amount - pDraft.previous_budget_amount;

                                    return (
                                      <React.Fragment key={parent.id}>
                                        <tr className="border-b border-slate-100 font-semibold hover:bg-slate-50/30">
                                          <td className="py-2.5 px-3 pl-5 text-slate-800">{parent.name}</td>
                                          <td className="py-2 px-3 text-right">
                                            <input
                                              type="number"
                                              value={pDraft.budget_amount === 0 ? '' : pDraft.budget_amount}
                                              onChange={(e) => setBudgetDraft((prev: any) => ({
                                                ...prev,
                                                [parent.id]: {
                                                  ...prev[parent.id],
                                                  budget_amount: parseInt(e.target.value, 10) || 0
                                                }
                                              }))}
                                              placeholder="0"
                                              className="border border-slate-200 text-right text-xs py-1 px-2 rounded-md w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                            />
                                          </td>
                                          <td className="py-2 px-3 text-right">
                                            <input
                                              type="number"
                                              value={pDraft.previous_budget_amount === 0 ? '' : pDraft.previous_budget_amount}
                                              onChange={(e) => setBudgetDraft((prev: any) => ({
                                                ...prev,
                                                [parent.id]: {
                                                  ...prev[parent.id],
                                                  previous_budget_amount: parseInt(e.target.value, 10) || 0
                                                }
                                              }))}
                                              placeholder="0"
                                              className="border border-slate-200 text-right text-xs py-1 px-2 rounded-md w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                            />
                                          </td>
                                          <td className={`py-2 px-3 text-right font-mono font-bold ${pDiff > 0 ? 'text-emerald-600' : pDiff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                            {pDiff >= 0 ? '+' : ''}{pDiff.toLocaleString()}
                                          </td>
                                          <td className="py-2 px-3">
                                            <input
                                              type="text"
                                              value={pDraft.note || ''}
                                              onChange={(e) => setBudgetDraft((prev: any) => ({
                                                ...prev,
                                                [parent.id]: {
                                                  ...prev[parent.id],
                                                  note: e.target.value
                                                }
                                              }))}
                                              placeholder="内訳やメモを入力"
                                              className="border border-slate-200 text-xs py-1 px-2 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                            />
                                          </td>
                                        </tr>

                                        {childs.map((child: any) => {
                                          const cDraft = budgetDraft[child.id] || { budget_amount: 0, previous_budget_amount: 0, note: '' };
                                          const cDiff = cDraft.budget_amount - cDraft.previous_budget_amount;
                                          return (
                                            <tr key={child.id} className="border-b border-slate-100 hover:bg-slate-50/50 text-slate-600">
                                              <td className="py-2.5 px-3 pl-8">└ {child.name}</td>
                                              <td className="py-2 px-3 text-right">
                                                <input
                                                  type="number"
                                                  value={cDraft.budget_amount === 0 ? '' : cDraft.budget_amount}
                                                  onChange={(e) => setBudgetDraft((prev: any) => ({
                                                    ...prev,
                                                    [child.id]: {
                                                      ...prev[child.id],
                                                      budget_amount: parseInt(e.target.value, 10) || 0
                                                    }
                                                  }))}
                                                  placeholder="0"
                                                  className="border border-slate-200 text-right text-xs py-1 px-2 rounded-md w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                                />
                                              </td>
                                              <td className="py-2 px-3 text-right">
                                                <input
                                                  type="number"
                                                  value={cDraft.previous_budget_amount === 0 ? '' : cDraft.previous_budget_amount}
                                                  onChange={(e) => setBudgetDraft((prev: any) => ({
                                                    ...prev,
                                                    [child.id]: {
                                                      ...prev[child.id],
                                                      previous_budget_amount: parseInt(e.target.value, 10) || 0
                                                    }
                                                  }))}
                                                  placeholder="0"
                                                  className="border border-slate-200 text-right text-xs py-1 px-2 rounded-md w-32 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                                />
                                              </td>
                                              <td className={`py-2 px-3 text-right font-mono font-bold ${cDiff > 0 ? 'text-emerald-600' : cDiff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                                {cDiff >= 0 ? '+' : ''}{cDiff.toLocaleString()}
                                              </td>
                                              <td className="py-2 px-3">
                                                <input
                                                  type="text"
                                                  value={cDraft.note || ''}
                                                  onChange={(e) => setBudgetDraft((prev: any) => ({
                                                    ...prev,
                                                    [child.id]: {
                                                      ...prev[child.id],
                                                      note: e.target.value
                                                    }
                                                  }))}
                                                  placeholder="内訳やメモを入力"
                                                  className="border border-slate-200 text-xs py-1 px-2 rounded-md w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                                />
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>

                            <div className="flex justify-end pt-2">
                              <button
                                onClick={handleSaveBudgets}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-3 rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                              >
                                <i className="fas fa-save"></i>予算額を保存する
                              </button>
                            </div>
                          </div>
                        )}

                        {/* サブタブ3: 実績・決算入力 */}
                        {assemblySubTab === 'settlement_input' && (
                          <div className="space-y-6 animate-fadeIn">
                            {/* 明細登録フォーム */}
                            <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl space-y-4">
                              <h4 className="font-bold text-slate-800 text-sm border-b pb-2 flex items-center">
                                <i className="fas fa-edit text-indigo-600 mr-1.5"></i>決算・実績明細の登録
                              </h4>
                              
                              <form onSubmit={handleSaveSettlement} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                  {/* 日付 */}
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">日付</label>
                                    <input
                                      type="date"
                                      value={newSettlementDate}
                                      onChange={(e) => setNewSettlementDate(e.target.value)}
                                      className="w-full bg-white border border-slate-200 text-slate-700 text-xs py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      required
                                    />
                                  </div>

                                  {/* 区分 */}
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">区分</label>
                                    <select
                                      value={newSettlementType}
                                      onChange={(e) => {
                                        const typeVal = e.target.value as 'income'|'expense';
                                        setNewSettlementType(typeVal);
                                        const firstCat = assemblyCategories.find((c: any) => c.type === typeVal);
                                        if (firstCat) setNewSettlementCatId(String(firstCat.id));
                                      }}
                                      className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    >
                                      <option value="expense">支出 (支払い)</option>
                                      <option value="income">収入</option>
                                    </select>
                                  </div>

                                  {/* 科目 / 補助科目 */}
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">科目 / 補助科目</label>
                                    <select
                                      value={newSettlementCatId}
                                      onChange={(e) => setNewSettlementCatId(e.target.value)}
                                      className="w-full bg-white border border-slate-200 text-slate-700 text-xs font-semibold py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                      required
                                    >
                                      {assemblyCategories
                                        .filter((c: any) => c.type === newSettlementType && !c.parent_id)
                                        .map((parent: any) => (
                                          <React.Fragment key={parent.id}>
                                            <option value={parent.id} disabled={parent.name === '会費' && parent.type === 'income'}>
                                              {parent.name} {parent.name === '会費' && parent.type === 'income' ? '(自動連携のみ)' : ''}
                                            </option>
                                            {assemblyCategories
                                              .filter((c: any) => c.parent_id === parent.id)
                                              .map((child: any) => (
                                                <option key={child.id} value={child.id}>　└ {child.name}</option>
                                              ))
                                            }
                                          </React.Fragment>
                                        ))
                                      }
                                    </select>
                                  </div>

                                  {/* 金額 */}
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">金額 (円)</label>
                                    <input
                                      type="number"
                                      value={newSettlementAmount}
                                      onChange={(e) => setNewSettlementAmount(e.target.value)}
                                      placeholder="金額を入力"
                                      className="w-full bg-white border border-slate-200 text-slate-700 text-xs py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                      required
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* 摘要 */}
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">摘要 / 備考 (内訳)</label>
                                    <input
                                      type="text"
                                      value={newSettlementDesc}
                                      onChange={(e) => setNewSettlementDesc(e.target.value)}
                                      placeholder="支払先や目的など (例: 〇〇電気代、防犯灯修理)"
                                      className="w-full bg-white border border-slate-200 text-slate-700 text-xs py-2 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    />
                                  </div>

                                  {/* 領収書ファイル */}
                                  <div>
                                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                                      領収書 / レシート添付 (画像またはPDF)
                                    </label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        id="receiptFileInput"
                                        type="file"
                                        accept="image/*,application/pdf"
                                        onChange={(e) => setNewSettlementFile(e.target.files?.[0] || null)}
                                        className="bg-white border border-slate-200 text-slate-700 text-xs py-1.5 px-3 rounded-lg focus:outline-none w-full cursor-pointer"
                                      />
                                      {newSettlementFile && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setNewSettlementFile(null);
                                            const fileInput = document.getElementById('receiptFileInput') as HTMLInputElement;
                                            if (fileInput) fileInput.value = '';
                                          }}
                                          className="text-xs text-rose-600 font-bold hover:underline shrink-0 cursor-pointer"
                                        >
                                          クリア
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                  <button
                                    type="submit"
                                    disabled={isUploadingReceipt}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-8 py-2.5 rounded-lg text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                                  >
                                    {isUploadingReceipt ? (
                                      <>
                                        <i className="fas fa-spinner animate-spin"></i>
                                        ファイルをアップロード中...
                                      </>
                                    ) : (
                                      <>
                                        <i className="fas fa-plus-circle"></i>
                                        明細を登録する
                                      </>
                                    )}
                                  </button>
                                </div>
                              </form>
                            </div>

                            {/* 会費自動連携の案内カード */}
                            <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="bg-indigo-100/80 text-indigo-600 w-8 h-8 rounded-lg flex items-center justify-center shrink-0">
                                  <i className="fas fa-sync-alt"></i>
                                </div>
                                <div className="text-left">
                                  <div className="text-xs font-black text-indigo-900">会費管理からの自動連携実績</div>
                                  <div className="text-[10px] text-indigo-600 font-bold mt-0.5">
                                    当会計年度の「会費管理」で決済完了となった合計金額が、リアルタイムに収入決算額に反映されます。
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-[10px] font-bold text-indigo-700">自動連携中の金額</div>
                                <div className="text-base font-black font-mono text-indigo-900">{assemblyFeeRevenue.toLocaleString()} 円</div>
                              </div>
                            </div>

                            {/* 月別集計マトリクス表示 */}
                            <div className="space-y-3">
                              <h4 className="font-bold text-slate-800 text-sm flex items-center">
                                <i className="fas fa-chart-line text-indigo-600 mr-1.5"></i>月次決算・集計マトリクス ({selectedFiscalYear}年度)
                              </h4>
                              
                              <div className="border border-slate-100 rounded-xl p-4 overflow-x-auto bg-slate-50/30">
                                <table className="w-full text-[10px] text-left border-collapse min-w-[1000px]">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 font-bold">
                                      <th className="py-2 px-1.5 w-[120px]">区分 / 科目</th>
                                      {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((m: number) => (
                                        <th key={m} className="py-2 px-1.5 text-right font-mono">{m}月</th>
                                      ))}
                                      <th className="py-2 px-1.5 text-right w-[100px]">合計 (円)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {/* 収入の部 */}
                                    <tr className="bg-emerald-50/40 text-emerald-800 font-bold">
                                      <td colSpan={14} className="py-1.5 px-2">【 収 入 】</td>
                                    </tr>
                                    {assemblyCategories.filter((c: any) => c.type === 'income').map((cat: any) => {
                                      const catName = cat.parent_id ? `　└ ${cat.name}` : cat.name;
                                      const matching = assemblySettlements.filter((s: any) => s.category_id === cat.id);
                                      
                                      // 各月の集計
                                      const monthlyAmounts = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((m: number) => {
                                        if (cat.name === '会費' && !cat.parent_id) return 0;
                                        return matching
                                          .filter((s: any) => new Date(s.paid_date).getMonth() + 1 === m)
                                          .reduce((sum: number, s: any) => sum + s.amount, 0);
                                      });

                                      const total = cat.name === '会費' && !cat.parent_id 
                                        ? assemblyFeeRevenue 
                                        : matching.reduce((sum: number, s: any) => sum + s.amount, 0);

                                      return (
                                        <tr key={cat.id} className="border-b border-slate-50 hover:bg-slate-50/40 text-slate-700">
                                          <td className="py-1.5 px-2 font-semibold">{catName}</td>
                                          {monthlyAmounts.map((amount: number, idx: number) => (
                                            <td key={idx} className="py-1.5 px-1.5 text-right font-mono">
                                              {cat.name === '会費' && !cat.parent_id ? '-' : amount === 0 ? '0' : amount.toLocaleString()}
                                            </td>
                                          ))}
                                          <td className="py-1.5 px-1.5 text-right font-mono font-bold bg-slate-50/50">
                                            {total.toLocaleString()}
                                          </td>
                                        </tr>
                                      );
                                    })}

                                    {/* 支出の部 */}
                                    <tr className="bg-rose-50/40 text-rose-800 font-bold">
                                      <td colSpan={14} className="py-1.5 px-2">【 支 出 】</td>
                                    </tr>
                                    {assemblyCategories.filter((c: any) => c.type === 'expense').map((cat: any) => {
                                      const catName = cat.parent_id ? `　└ ${cat.name}` : cat.name;
                                      const matching = assemblySettlements.filter((s: any) => s.category_id === cat.id);
                                      
                                      const monthlyAmounts = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((m: number) => {
                                        return matching
                                          .filter((s: any) => new Date(s.paid_date).getMonth() + 1 === m)
                                          .reduce((sum: number, s: any) => sum + s.amount, 0);
                                      });

                                      const total = matching.reduce((sum: number, s: any) => sum + s.amount, 0);

                                      return (
                                        <tr key={cat.id} className="border-b border-slate-50 hover:bg-slate-50/40 text-slate-700">
                                          <td className="py-1.5 px-2 font-semibold">{catName}</td>
                                          {monthlyAmounts.map((amount: number, idx: number) => (
                                            <td key={idx} className="py-1.5 px-1.5 text-right font-mono">
                                              {amount === 0 ? '0' : amount.toLocaleString()}
                                            </td>
                                          ))}
                                          <td className="py-1.5 px-1.5 text-right font-mono font-bold bg-slate-50/50">
                                            {total.toLocaleString()}
                                          </td>
                                        </tr>
                                      );
                                    })}

                                    {/* 総集計行 */}
                                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-200">
                                      <td className="py-2 px-2 text-slate-800">収入合計</td>
                                      {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((m: number) => {
                                        const incTotal = assemblySettlements
                                          .filter((s: any) => s.type === 'income' && new Date(s.paid_date).getMonth() + 1 === m)
                                          .reduce((sum: number, s: any) => sum + s.amount, 0);
                                        return (
                                          <td key={m} className="py-2 px-1.5 text-right font-mono text-emerald-700">
                                            {incTotal.toLocaleString()}
                                          </td>
                                        );
                                      })}
                                      <td className="py-2 px-1.5 text-right font-mono text-emerald-700 bg-slate-200/50">
                                        {(
                                          assemblySettlements.filter((s: any) => s.type === 'income').reduce((sum: number, s: any) => sum + s.amount, 0) + assemblyFeeRevenue
                                        ).toLocaleString()}
                                      </td>
                                    </tr>
                                    <tr className="bg-slate-100 font-bold">
                                      <td className="py-2 px-2 text-slate-800">支出合計</td>
                                      {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((m: number) => {
                                        const expTotal = assemblySettlements
                                          .filter((s: any) => s.type === 'expense' && new Date(s.paid_date).getMonth() + 1 === m)
                                          .reduce((sum: number, s: any) => sum + s.amount, 0);
                                        return (
                                          <td key={m} className="py-2 px-1.5 text-right font-mono text-rose-700">
                                            {expTotal.toLocaleString()}
                                          </td>
                                        );
                                      })}
                                      <td className="py-2 px-1.5 text-right font-mono text-rose-700 bg-slate-200/50">
                                        {assemblySettlements.filter((s: any) => s.type === 'expense').reduce((sum: number, s: any) => sum + s.amount, 0).toLocaleString()}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* 登録明細一覧 */}
                            <div className="space-y-3 pt-2">
                              <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-800 text-sm flex items-center">
                                  <i className="fas fa-list-ul text-indigo-600 mr-1.5"></i>登録済みの明細一覧
                                </h4>
                                <div className="flex items-center gap-2">
                                  <label className="text-xs font-bold text-slate-600 whitespace-nowrap">表示月:</label>
                                  <select
                                    value={selectedSettlementMonth}
                                    onChange={(e) => setSelectedSettlementMonth(e.target.value)}
                                    className="bg-white border border-slate-200 text-slate-700 text-xs font-bold py-1.5 px-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                                  >
                                    <option value="all">すべて表示</option>
                                    {[4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((m: number) => (
                                      <option key={m} value={String(m)}>{m}月</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              
                              <div className="border border-slate-100 rounded-xl overflow-hidden bg-white shadow-sm">
                                <table className="w-full text-xs text-left border-collapse">
                                  <thead>
                                    <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-100">
                                      <th className="py-3 px-4">日付</th>
                                      <th className="py-3 px-4">区分</th>
                                      <th className="py-3 px-4">科目</th>
                                      <th className="py-3 px-4 text-right">金額 (円)</th>
                                      <th className="py-3 px-4">摘要 / 備考</th>
                                      <th className="py-3 px-4 text-center">領収書</th>
                                      <th className="py-3 px-4 text-center">アクション</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {(() => {
                                      const filtered = assemblySettlements.filter((s: any) => {
                                        if (selectedSettlementMonth === 'all') return true;
                                        const m = new Date(s.paid_date).getMonth() + 1;
                                        return m === parseInt(selectedSettlementMonth, 10);
                                      });

                                      if (filtered.length === 0) {
                                        return (
                                          <tr>
                                            <td colSpan={7} className="py-8 text-center text-slate-400 font-semibold">
                                              {selectedSettlementMonth === 'all' 
                                                ? '登録された決算・実績明細はありません。' 
                                                : '選択された月の決算・実績明細はありません。'}
                                            </td>
                                          </tr>
                                        );
                                      }

                                      return [...filtered].reverse().map((item: any) => {
                                        const cat = assemblyCategories.find((c: any) => c.id === item.category_id);
                                        return (
                                          <tr key={item.id} className="hover:bg-slate-50/50 text-slate-700 transition">
                                            <td className="py-2.5 px-4 font-mono font-semibold">{item.paid_date}</td>
                                            <td className="py-2.5 px-4">
                                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                item.type === 'income' 
                                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                                                  : 'bg-rose-50 text-rose-700 border border-rose-100'
                                              }`}>
                                                {item.type === 'income' ? '収入' : '支出'}
                                              </span>
                                            </td>
                                            <td className="py-2.5 px-4 font-semibold">{cat ? cat.name : '未分類'}</td>
                                            <td className="py-2.5 px-4 text-right font-mono font-bold">{item.amount.toLocaleString()}</td>
                                            <td className="py-2.5 px-4 text-slate-600 font-semibold">{item.description || '-'}</td>
                                            <td className="py-2.5 px-4 text-center">
                                              {item.receipt_url ? (
                                                <a
                                                  href={item.receipt_url}
                                                  target="_blank"
                                                  rel="noopener noreferrer"
                                                  className="text-indigo-600 hover:text-indigo-800 text-[11px] font-bold bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md inline-flex items-center gap-1 transition cursor-pointer"
                                                >
                                                  <i className="fas fa-file-image"></i>表示
                                                </a>
                                              ) : (
                                                <span className="text-slate-400 font-semibold text-[10px]">-</span>
                                              )}
                                            </td>
                                            <td className="py-2.5 px-4 text-center">
                                              <button
                                                onClick={() => handleDeleteSettlement(item.id)}
                                                className="text-rose-500 hover:text-rose-700 text-xs font-bold bg-rose-50 border border-rose-100 px-2 py-1 rounded cursor-pointer transition hover:bg-rose-100"
                                              >
                                                <i className="fas fa-trash-alt mr-1"></i>削除
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      });
                                    })()}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* サブタブ4: 決算書作成 */}
                        {assemblySubTab === 'settlement_view' && (
                          <div className="space-y-6 animate-fadeIn">
                            <div className="flex items-center justify-between">
                              <h4 className="font-bold text-slate-800 text-sm flex items-center">
                                <i className="fas fa-file-alt text-indigo-600 mr-1.5"></i>収支決算書(案)のプレビュー
                              </h4>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handlePrintSettlement(selectedFiscalYear, settingsData?.town_name || '', assemblyCategories, assemblyBudgets, assemblySettlements, assemblyFeeRevenue)}
                                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3 py-1.5 rounded-lg text-xs shadow-md transition cursor-pointer flex items-center gap-1"
                                >
                                  <i className="fas fa-print"></i>印刷 (PDF)
                                </button>
                                <button
                                  onClick={() => handleExportSettlementCSV(selectedFiscalYear, assemblyCategories, assemblyBudgets, assemblySettlements, assemblyFeeRevenue)}
                                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
                                >
                                  <i className="fas fa-file-csv text-emerald-600"></i>CSV出力
                                </button>
                              </div>
                            </div>

                            {/* 決算書概要サマリーカード */}
                            {(() => {
                              const totalIncBudget = assemblyCategories
                                .filter((c: any) => c.type === 'income')
                                .reduce((sum: number, c: any) => {
                                  const b = assemblyBudgets.find((x: any) => x.category_id === c.id);
                                  return sum + (b ? b.budget_amount : 0);
                                }, 0);

                              const totalIncActual = assemblyCategories
                                .filter((c: any) => c.type === 'income')
                                .reduce((sum: number, c: any) => {
                                  if (c.name === '会費' && !c.parent_id) return sum + assemblyFeeRevenue;
                                  const actual = assemblySettlements
                                    .filter((s: any) => s.category_id === c.id)
                                    .reduce((sSum: number, s: any) => sSum + s.amount, 0);
                                  return sum + actual;
                                }, 0);

                              const totalExpBudget = assemblyCategories
                                .filter((c: any) => c.type === 'expense')
                                .reduce((sum: number, c: any) => {
                                  const b = assemblyBudgets.find((x: any) => x.category_id === c.id);
                                  return sum + (b ? b.budget_amount : 0);
                                }, 0);

                              const totalExpActual = assemblyCategories
                                .filter((c: any) => c.type === 'expense')
                                .reduce((sum: number, c: any) => {
                                  const actual = assemblySettlements
                                    .filter((s: any) => s.category_id === c.id)
                                    .reduce((sSum: number, s: any) => sSum + s.amount, 0);
                                  return sum + actual;
                                }, 0);

                              const balance = totalIncActual - totalExpActual;

                              return (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 border border-slate-100 rounded-xl p-5">
                                  <div className="bg-white border border-slate-200/60 p-4 rounded-lg shadow-sm">
                                    <div className="text-xs font-bold text-slate-500 font-semibold">収入総額 (実績)</div>
                                    <div className="text-lg font-black font-mono text-emerald-700 mt-1">{totalIncActual.toLocaleString()} 円</div>
                                    <div className="text-[10px] text-slate-400 font-semibold mt-1">予算額: {totalIncBudget.toLocaleString()} 円</div>
                                  </div>
                                  <div className="bg-white border border-slate-200/60 p-4 rounded-lg shadow-sm">
                                    <div className="text-xs font-bold text-slate-500 font-semibold">支出総額 (実績)</div>
                                    <div className="text-lg font-black font-mono text-rose-600 mt-1">{totalExpActual.toLocaleString()} 円</div>
                                    <div className="text-[10px] text-slate-400 font-semibold mt-1">予算額: {totalExpBudget.toLocaleString()} 円</div>
                                  </div>
                                  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg shadow-sm">
                                    <div className="text-xs font-black text-indigo-700">差引残高 (翌年度繰越額)</div>
                                    <div className="text-lg font-black font-mono text-indigo-900 mt-1">{balance.toLocaleString()} 円</div>
                                    <div className="text-[10px] text-indigo-600 font-bold mt-1">※ 収入実績 - 支出実績</div>
                                  </div>
                                </div>
                              );
                            })()}

                            {/* 決算書プレビューテーブル */}
                            <div className="border border-slate-100 rounded-xl p-4 overflow-x-auto bg-slate-50/30">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                                    <th className="py-2.5 px-3 w-[25%]">科 目</th>
                                    <th className="py-2.5 px-3 w-[20%] text-right">予算額 (円)</th>
                                    <th className="py-2.5 px-3 w-[20%] text-right">決算額 (円)</th>
                                    <th className="py-2.5 px-3 w-[15%] text-right">増減 (円)</th>
                                    <th className="py-2.5 px-3">内訳 / 摘要備考</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {/* 収入の部 */}
                                  <tr className="bg-emerald-50/40 text-emerald-800 font-bold">
                                    <td colSpan={5} className="py-2 px-3">【 収 入 】</td>
                                  </tr>
                                  {(() => {
                                    const incomeCats = assemblyCategories.filter((c: any) => c.type === 'income');
                                    let subIncBudget = 0;
                                    let subIncActual = 0;

                                    return (
                                      <>
                                        {incomeCats.filter((c: any) => !c.parent_id).map((parent: any) => {
                                          const childs = incomeCats.filter((c: any) => c.parent_id === parent.id);
                                          
                                          const getCatData = (cat: any) => {
                                            const budget = assemblyBudgets.find((b: any) => b.category_id === cat.id)?.budget_amount || 0;
                                            let actual = 0;
                                            let note = '';
                                            if (cat.name === '会費' && cat.type === 'income') {
                                              actual = assemblyFeeRevenue;
                                              note = '会費管理より自動連携';
                                            } else {
                                              const items = assemblySettlements.filter((s: any) => s.category_id === cat.id);
                                              actual = items.reduce((sum: number, s: any) => sum + s.amount, 0);
                                              note = items.map((s: any) => s.description).filter(Boolean).join(', ');
                                            }
                                            return { budget, actual, diff: actual - budget, note };
                                          };

                                          const pData = getCatData(parent);
                                          subIncBudget += pData.budget;
                                          subIncActual += pData.actual;

                                          return (
                                            <React.Fragment key={parent.id}>
                                              <tr className="border-b border-slate-100 font-semibold hover:bg-slate-50/20 text-slate-800">
                                                <td className="py-2.5 px-3 pl-5">{parent.name}</td>
                                                <td className="py-2.5 px-3 text-right font-mono">{pData.budget.toLocaleString()}</td>
                                                <td className="py-2.5 px-3 text-right font-mono">{pData.actual.toLocaleString()}</td>
                                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${pData.diff > 0 ? 'text-emerald-600' : pData.diff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                                  {pData.diff >= 0 ? '+' : ''}{pData.diff.toLocaleString()}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-500 text-[11px] font-semibold">{pData.note || '-'}</td>
                                              </tr>

                                              {childs.map((child: any) => {
                                                const cData = getCatData(child);
                                                subIncBudget += cData.budget;
                                                subIncActual += cData.actual;

                                                return (
                                                  <tr key={child.id} className="border-b border-slate-100 hover:bg-slate-50/30 text-slate-600">
                                                    <td className="py-2.5 px-3 pl-8">└ {child.name}</td>
                                                    <td className="py-2.5 px-3 text-right font-mono">{cData.budget.toLocaleString()}</td>
                                                    <td className="py-2.5 px-3 text-right font-mono">{cData.actual.toLocaleString()}</td>
                                                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${cData.diff > 0 ? 'text-emerald-600' : cData.diff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                                      {cData.diff >= 0 ? '+' : ''}{cData.diff.toLocaleString()}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-500 text-[11px] font-semibold">{cData.note || '-'}</td>
                                                  </tr>
                                                );
                                              })}
                                            </React.Fragment>
                                          );
                                        })}
                                        <tr className="bg-slate-100 font-bold border-b border-slate-200 text-slate-800">
                                          <td className="py-2.5 px-3">収入合計</td>
                                          <td className="py-2.5 px-3 text-right font-mono">{subIncBudget.toLocaleString()}</td>
                                          <td className="py-2.5 px-3 text-right font-mono">{subIncActual.toLocaleString()}</td>
                                          <td className={`py-2.5 px-3 text-right font-mono ${subIncActual - subIncBudget >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {subIncActual - subIncBudget >= 0 ? '+' : ''}{(subIncActual - subIncBudget).toLocaleString()}
                                          </td>
                                          <td></td>
                                        </tr>
                                      </>
                                    );
                                  })()}

                                  {/* 支出の部 */}
                                  <tr className="bg-rose-50/40 text-rose-800 font-bold">
                                    <td colSpan={5} className="py-2 px-3">【 支 出 】</td>
                                  </tr>
                                  {(() => {
                                    const expenseCats = assemblyCategories.filter((c: any) => c.type === 'expense');
                                    let subExpBudget = 0;
                                    let subExpActual = 0;

                                    return (
                                      <>
                                        {expenseCats.filter((c: any) => !c.parent_id).map((parent: any) => {
                                          const childs = expenseCats.filter((c: any) => c.parent_id === parent.id);
                                          
                                          const getCatData = (cat: any) => {
                                            const budget = assemblyBudgets.find((b: any) => b.category_id === cat.id)?.budget_amount || 0;
                                            const items = assemblySettlements.filter((s: any) => s.category_id === cat.id);
                                            const actual = items.reduce((sum: number, s: any) => sum + s.amount, 0);
                                            const note = items.map((s: any) => s.description).filter(Boolean).join(', ');
                                            return { budget, actual, diff: actual - budget, note };
                                          };

                                          const pData = getCatData(parent);
                                          subExpBudget += pData.budget;
                                          subExpActual += pData.actual;

                                          return (
                                            <React.Fragment key={parent.id}>
                                              <tr className="border-b border-slate-100 font-semibold hover:bg-slate-50/20 text-slate-800">
                                                <td className="py-2.5 px-3 pl-5">{parent.name}</td>
                                                <td className="py-2.5 px-3 text-right font-mono">{pData.budget.toLocaleString()}</td>
                                                <td className="py-2.5 px-3 text-right font-mono">{pData.actual.toLocaleString()}</td>
                                                <td className={`py-2.5 px-3 text-right font-mono font-bold ${pData.diff > 0 ? 'text-emerald-600' : pData.diff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                                  {pData.diff >= 0 ? '+' : ''}{pData.diff.toLocaleString()}
                                                </td>
                                                <td className="py-2.5 px-3 text-slate-500 text-[11px] font-semibold">{pData.note || '-'}</td>
                                              </tr>

                                              {childs.map((child: any) => {
                                                const cData = getCatData(child);
                                                subExpBudget += cData.budget;
                                                subExpActual += cData.actual;

                                                return (
                                                  <tr key={child.id} className="border-b border-slate-100 hover:bg-slate-50/30 text-slate-600">
                                                    <td className="py-2.5 px-3 pl-8">└ {child.name}</td>
                                                    <td className="py-2.5 px-3 text-right font-mono">{cData.budget.toLocaleString()}</td>
                                                    <td className="py-2.5 px-3 text-right font-mono">{cData.actual.toLocaleString()}</td>
                                                    <td className={`py-2.5 px-3 text-right font-mono font-bold ${cData.diff > 0 ? 'text-emerald-600' : cData.diff < 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                                                      {cData.diff >= 0 ? '+' : ''}{cData.diff.toLocaleString()}
                                                    </td>
                                                    <td className="py-2.5 px-3 text-slate-500 text-[11px] font-semibold">{cData.note || '-'}</td>
                                                  </tr>
                                                );
                                              })}
                                            </React.Fragment>
                                          );
                                        })}
                                        <tr className="bg-slate-100 font-bold border-b border-slate-200 text-slate-800">
                                          <td className="py-2.5 px-3">支出合計</td>
                                          <td className="py-2.5 px-3 text-right font-mono">{subExpBudget.toLocaleString()}</td>
                                          <td className="py-2.5 px-3 text-right font-mono">{subExpActual.toLocaleString()}</td>
                                          <td className={`py-2.5 px-3 text-right font-mono ${subExpActual - subExpBudget >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {subExpActual - subExpBudget >= 0 ? '+' : ''}{(subExpActual - subExpBudget).toLocaleString()}
                                          </td>
                                          <td></td>
                                        </tr>
                                      </>
                                    );
                                  })()}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              )}
