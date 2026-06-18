const fs = require('fs');
const path = require('path');

const filePath = 'C:\\Users\\info\\.gemini\\antigravity\\scratch\\qoin\\src\\components\\AdminView.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 検索対象のユニークな文字列
const searchKey = '<th className="p-3 font-bold border-b text-center w-10">';

const startIdx = content.indexOf(searchKey);
if (startIdx === -1) {
  console.error("Error: searchKey not found in AdminView.tsx!");
  process.exit(1);
}

// searchKey の開始位置（つまり、<th className="p-3 font-bold border-b text-center w-10"> の開始点）を取得
const targetStartIdx = startIdx;

// 挿入する新しいコードブロック（ヘッダーセル <th className="p-3 font-bold border-b text-center w-10"> 自体も含む）
const newCodeBlock = `<th className="p-3 font-bold border-b text-center w-10">
                                    <input 
                                      type="checkbox" 
                                      checked={rosters.length > 0 && selectedFeeRosters.length === rosters.length}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedFeeRosters(rosters.map(r => r.id));
                                        } else {
                                          setSelectedFeeRosters([]);
                                        }
                                      }}
                                      className="cursor-pointer"
                                    />
                                  </th>
                                  <th className="p-3 font-bold border-b text-right">請求（期待）額</th>
                                  <th className="p-3 font-bold border-b text-right">今年度 納入済額</th>
                                  <th className="p-3 font-bold border-b text-center">ステータス</th>
                                  <th className="p-3 font-bold border-b text-center">操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {rosters.map(r => {
                                  const currentYear = new Date().getFullYear();
                                  const record = feeRecords.find(f => f.roster_id === r.id && f.year === currentYear);
                                  const isEditing = editingFeeRosterId === r.id;
                                  
                                  const expected = record ? record.expected_amount : null;
                                  const paid = record ? record.paid_amount : 0;
                                  
                                  const isPaidFull = expected !== null && paid >= expected;
                                  
                                  return (
                                    <tr key={r.id} className="hover:bg-orange-50/20 border-b last:border-b-0 transition">
                                      <td className="p-3 text-center">
                                        <input 
                                          type="checkbox" 
                                          checked={selectedFeeRosters.includes(r.id)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedFeeRosters([...selectedFeeRosters, r.id]);
                                            } else {
                                              setSelectedFeeRosters(selectedFeeRosters.filter(id => id !== r.id));
                                            }
                                          }}
                                          className="cursor-pointer"
                                        />
                                      </td>
                                      <td className="p-3 text-gray-800 font-bold">{r.full_name}</td>
                                      
                                      {isEditing ? (
                                        <>
                                          <td className="p-2 text-right">
                                            <input 
                                              type="number"
                                              placeholder={String(systemSettings?.annual_fee_amount || 3000)}
                                              value={editFeeData.expected_amount}
                                              onChange={e => setEditFeeData({...editFeeData, expected_amount: e.target.value})}
                                              className="w-24 border border-indigo-300 rounded px-2 py-1 text-right text-xs focus:ring-1 focus:ring-indigo-500 outline-none inline-block"
                                            />
                                            <span className="text-[10px] text-gray-400 ml-1">円</span>
                                          </td>
                                          <td className="p-2 text-right">
                                            <input 
                                              type="number"
                                              value={editFeeData.paid_amount}
                                              onChange={e => setEditFeeData({...editFeeData, paid_amount: e.target.value})}
                                              className="w-24 border border-indigo-300 rounded px-2 py-1 text-right text-xs focus:ring-1 focus:ring-indigo-500 outline-none inline-block"
                                            />
                                            <span className="text-[10px] text-gray-400 ml-1">円</span>
                                          </td>
                                          <td className="p-3 text-center">
                                            <span className="text-xs text-gray-400 font-bold">編集中...</span>
                                          </td>
                                          <td className="p-3 text-center">
                                            <div className="flex gap-1.5 justify-center">
                                              <button 
                                                onClick={() => handleSaveFee(r.id)}
                                                disabled={feeIsSubmitting}
                                                className="bg-green-600 hover:bg-green-700 text-white font-bold px-2 py-1 rounded text-xs transition cursor-pointer"
                                              >
                                                保存
                                              </button>
                                              <button 
                                                onClick={() => setEditingFeeRosterId(null)}
                                                className="bg-gray-400 hover:bg-gray-500 text-white font-bold px-2 py-1 rounded text-xs transition cursor-pointer"
                                              >
                                                取消
                                              </button>
                                            </div>
                                          </td>
                                        </>
                                      ) : (
                                        <>
                                          <td className="p-3 text-right text-gray-800 font-mono">
                                            {expected !== null ? \`\${expected.toLocaleString()}円\` : \`一般会員 (\${(systemSettings?.annual_fee_amount || 3000).toLocaleString()}円)\`}
                                          </td>
                                          <td className="p-3 text-right text-gray-800 font-mono font-bold">
                                            {paid.toLocaleString()}円
                                          </td>
                                          <td className="p-3 text-center">
                                            {isPaidFull ? (
                                              <span className="bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 rounded text-[10px] font-bold"><i className="fas fa-check-circle mr-1"></i>完納</span>
                                            ) : (
                                              <span className="bg-red-100 text-red-700 border border-red-200 px-2 py-0.5 rounded text-[10px] font-bold"><i className="fas fa-exclamation-circle mr-1"></i>未納</span>
                                            )}
                                          </td>
                                          <td className="p-3 text-center">
                                            <button 
                                              onClick={() => {
                                                setEditingFeeRosterId(r.id);
                                                setEditFeeData({
                                                  expected_amount: expected !== null ? String(expected) : '',
                                                  paid_amount: String(paid)
                                                });
                                              }}
                                              className="text-indigo-600 hover:bg-indigo-50 px-2 py-1.5 rounded transition cursor-pointer text-xs font-bold"
                                            >
                                              <i className="fas fa-edit mr-1"></i>編集
                                            </button>
                                          </td>
                                        </>
                                      )}
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* タブ8: オンライン集金(Stripe連携) */}
              {settingsTab === 'stripe' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-indigo-50/75 border-2 border-indigo-200 p-4 md:p-6 rounded-2xl shadow-sm relative overflow-hidden">
                    <h4 className="font-bold text-indigo-800 mb-4 text-lg flex items-center border-b border-indigo-200 pb-3">
                      <i className="fas fa-credit-card mr-2 text-indigo-600"></i>町内会費オンライン集金システム（Stripe連携）
                    </h4>
                    
                    <div className="space-y-6">
                      {/* メイン連携カード */}
                      <div className="bg-white p-5 md:p-8 rounded-2xl border border-indigo-100 text-center shadow-md relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                        
                        <h4 className="font-black text-indigo-900 mb-3 text-base md:text-xl flex items-center justify-center mt-2">
                          <i className="fas fa-link text-indigo-600 mr-2"></i>Stripe（ストライプ）アカウントの連携
                        </h4>
                        
                        <p className="text-xs md:text-sm text-gray-600 max-w-lg mx-auto mb-6 leading-relaxed">
                          町内会費・自治会費のクレジットカード決済を受け取るには、世界水準の安全な決済システム「Stripe」のアカウントを作成・連携する必要があります。
                        </p>

                        {settingsData?.stripe_account_id ? (
                          <div className="flex flex-col items-center justify-center space-y-4">
                            <div className="inline-flex items-center bg-green-50 text-green-700 px-6 py-3 rounded-xl border border-green-200 font-bold shadow-sm animate-bounce">
                              <i className="fas fa-check-circle mr-2 text-xl text-green-500"></i>
                              Stripe連携が完了しています
                            </div>
                            <div className="text-xs text-gray-500 font-bold font-mono">
                              アカウントID: {settingsData.stripe_account_id}
                            </div>
                          </div>
                        ) : (
                          <div className="max-w-xl mx-auto space-y-6">
                            {/* 準備するものチェックリスト */}
                            <div className="bg-yellow-50/50 p-4 rounded-xl border border-yellow-200 text-left text-xs text-gray-700 shadow-inner">
                              <p className="font-bold text-yellow-800 mb-2 flex items-center">
                                <i className="fas fa-exclamation-triangle mr-1.5 text-yellow-600"></i>
                                ご登録前に準備していただくもの
                              </p>
                              <ul className="list-disc pl-5 space-y-1 text-gray-600">
                                <li><strong>代表者様の本人確認書類</strong>（運転免許証、マイナンバーカードなど）</li>
                                <li><strong>会費を受け取る銀行口座の情報</strong>（通帳など、代表者名義または団体名義）</li>
                              </ul>
                              <p className="mt-2 text-[10px] text-gray-500 leading-normal">
                                ※登録手続きはStripe社の安全なページで行われ、通常5〜10分程度で完了します。
                              </p>
                            </div>

                            {/* 連携ボタン */}
                            <button
                              disabled={isConnectingStripe}
                              onClick={async () => {
                                const confirmMsg = "これより、決済代行会社（Stripe）の登録画面へ移動します。\\n\\nお手元に「本人確認書類」と「口座情報」をご用意の上、「OK」を押して手続きを進めてください。";
                                if (!confirm(confirmMsg)) return;

                                setIsConnectingStripe(true);
                                try {
                                  const baseUrl = window.location.origin;
                                  const res = await fetch('/.netlify/functions/create-stripe-account', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      townId,
                                      returnUrl: \`\${baseUrl}/admin/stripe/return?townId=\${townId}\`,
                                      refreshUrl: \`\${baseUrl}/admin/stripe/refresh?townId=\${townId}\`
                                    })
                                  });
                                  const data = await res.json();
                                  if (data.url) {
                                    if (liff.isInClient()) {
                                      liff.openWindow({
                                        url: data.url,
                                        external: true,
                                      });
                                    } else {
                                      window.location.href = data.url;
                                    }
                                  } else {
                                    alert('エラー: ' + (data.error || '不明なエラー'));
                                  }
                                } catch (e: any) {
                                  alert('通信エラー: ' + e.message);
                                } finally {
                                  setIsConnectingStripe(false);
                                }
                              }}
                              className={\`w-full max-w-md \${isConnectingStripe ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-xl active:scale-95'} text-white font-black px-8 py-4 rounded-xl shadow-lg transition transform cursor-pointer flex items-center justify-center mx-auto text-base\`}
                            >
                              {isConnectingStripe ? (
                                <>
                                  <i className="fas fa-spinner fa-spin mr-2"></i>
                                  Stripeに接続中...（数秒かかります）
                                </>
                              ) : (
                                <>
                                  <i className="fas fa-external-link-alt mr-2"></i>
                                  Stripeアカウントを登録・連携する
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 整理統合された3大解説ガイド（アコーディオン形式） */}
                      <div className="space-y-4 max-w-3xl mx-auto">
                        <h5 className="font-bold text-indigo-900 text-sm md:text-base flex items-center justify-center py-2">
                          <i className="fas fa-info-circle mr-2 text-indigo-600"></i>
                          Stripe連携・オンライン集金解説ガイド
                        </h5>

                        {/* ① 推奨理由＆メリット */}
                        <details className="group bg-white p-4 rounded-xl border border-indigo-100 shadow-sm hover:shadow-md transition duration-200 cursor-pointer">
                          <summary className="font-bold text-indigo-900 flex items-center justify-between outline-none list-none text-xs md:text-sm">
                            <span className="flex items-center">
                              <i className="fas fa-thumbs-up text-indigo-600 mr-2 w-5 text-center"></i>
                              ① なぜStripe決済を推奨するのか？（導入メリットと手数料）
                            </span>
                            <i className="fas fa-chevron-down text-indigo-400 group-open:rotate-180 transition transform duration-200"></i>
                          </summary>
                          <div className="mt-4 text-xs md:text-sm text-gray-600 leading-relaxed border-t border-indigo-50 pt-3 space-y-3">
                            <p>
                              el-townでは、町内会・自治会の皆様の集金作業を劇的に楽にするために、世界中で数百万社に選ばれている決済代行サービス<strong>「Stripe（ストライプ）」</strong>を採用しています。
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                              <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50">
                                <span className="font-bold text-indigo-800 block text-xs mb-1">
                                  <i className="fas fa-check text-green-600 mr-1"></i>初期費用・固定費0円
                                </span>
                                登録費や月額基本料金は一切かかりません。クレジットカード決済が行われた時のみ、<strong>手数料3.6%</strong>（3,000円の会費なら108円）が差し引かれます。
                              </div>
                              <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50">
                                <span className="font-bold text-indigo-800 block text-xs mb-1">
                                  <i className="fas fa-check text-green-600 mr-1"></i>役員の集金負担が「ゼロ」に
                                </span>
                                面倒な個別訪問や、不在時の再訪問、現金のやり取りによる紛失・盗難・計算ミスのリスクがなくなります。
                              </div>
                              <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50">
                                <span className="font-bold text-indigo-800 block text-xs mb-1">
                                  <i className="fas fa-check text-green-600 mr-1"></i>現金とのハイブリッド運用
                                </span>
                                スマホを使わない高齢の住民の方などには、従来どおり「現金手渡し」で回収し、管理画面から役員が手動で「完納」にチェックを入れるだけで一緒に管理できます。
                              </div>
                              <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100/50">
                                <span className="font-bold text-indigo-800 block text-xs mb-1">
                                  <i className="fas fa-check text-green-600 mr-1"></i>世界標準のセキュリティ
                                </span>
                                銀行口座やクレジットカードなどの極めて重要な情報はすべてStripe社が厳重に保管します。当サービス側には一切保存されないため、情報漏洩の心配がなく安心です。会費はStripe社から直接町内会の指定口座に振り込まれます。
                              </div>
                            </div>
                          </div>
                        </details>

                        {/* ② 任意団体ガイド */}
                        <details className="group bg-white p-4 rounded-xl border border-indigo-100 shadow-sm hover:shadow-md transition duration-200 cursor-pointer">
                          <summary className="font-bold text-indigo-900 flex items-center justify-between outline-none list-none text-xs md:text-sm">
                            <span className="flex items-center">
                              <i className="fas fa-hotel text-indigo-600 mr-2 w-5 text-center"></i>
                              ② 任意団体（法人番号なし）でのスムーズな登録のコツ
                            </span>
                            <i className="fas fa-chevron-down text-indigo-400 group-open:rotate-180 transition transform duration-200"></i>
                          </summary>
                          <div className="mt-4 text-xs md:text-sm text-gray-600 leading-relaxed border-t border-indigo-50 pt-3 space-y-3">
                            <p>
                              町内会や自治会、サークルなどの多くは、法人登記（法人番号）を持たない<strong>「任意団体」</strong>です。Stripeに登録・申請する際は、以下の点に注意して入力することで、スムーズに審査を通過し連携を完了できます。
                            </p>
                            <div className="space-y-2 mt-2">
                              <div className="flex items-start gap-2 text-xs md:text-sm">
                                <span className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0 mt-0.5">事業者形態</span>
                                <div>
                                  <strong>「個人事業主」</strong>または<strong>「非 nonprofit 団体」</strong>を選択します。任意団体はStripe上ではこのいずれかの区分で登録を行います。
                                </div>
                              </div>
                              <div className="flex items-start gap-2 text-xs md:text-sm">
                                <span className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0 mt-0.5">法人番号</span>
                                <div>
                                  法人登記をしていない場合は、<strong>「空欄」のまま空けておいて</strong>問題ありません。
                                </div>
                              </div>
                              <div className="flex items-start gap-2 text-xs md:text-sm">
                                <span className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0 mt-0.5">代表者情報</span>
                                <div>
                                  手続きを行う代表者様（町内会長、会計役員など）の<strong>「個人の氏名」および「自宅住所」</strong>を入力します。代表者の本人確認用のため、アップロードする身分証明書（運転免許証など）と一致している必要があります。
                                </div>
                              </div>
                              <div className="flex items-start gap-2 text-xs md:text-sm">
                                <span className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0 mt-0.5">ホームページ</span>
                                <div>
                                  町内会独自のウェブサイトがない場合は、el-townの公式URL（<code>https://el-town.jp</code>）を入力してください。
                                </div>
                              </div>
                              <div className="flex items-start gap-2 text-xs md:text-sm">
                                <span className="bg-indigo-600 text-white font-bold px-1.5 py-0.5 rounded text-[10px] shrink-0 mt-0.5">銀行口座名義</span>
                                <div>
                                  会費を受け取る銀行口座（通帳）のカナ名義を<strong>半角カタカナで正確に入力</strong>します。
                                  <br />
                                  <span className="text-[10px] text-orange-600 font-bold">
                                    ※「カタカナ名義」と「代表者様のお名前」に相違がある場合、のちほどStripeから『通帳のコピー（表面や見開き1ページ目）』の画像アップロードを求められることがありますので、その指示に従ってください。
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </details>

                        {/* ③ テスト手順 */}
                        <details className="group bg-white p-4 rounded-xl border border-indigo-100 shadow-sm hover:shadow-md transition duration-200 cursor-pointer">
                          <summary className="font-bold text-indigo-900 flex items-center justify-between outline-none list-none text-xs md:text-sm">
                            <span className="flex items-center">
                              <i className="fas fa-vial text-indigo-600 mr-2 w-5 text-center"></i>
                              ③ テストモードでの接続・動作確認手順
                            </span>
                            <i className="fas fa-chevron-down text-indigo-400 group-open:rotate-180 transition transform duration-200"></i>
                          </summary>
                          <div className="mt-4 text-xs md:text-sm text-gray-600 leading-relaxed border-t border-indigo-50 pt-3 space-y-3">
                            <p>
                              いきなり本物の口座やクレジットカードを使うのが不安な場合は、Stripeの<strong>「テスト環境」</strong>を利用して、実際にどのように集集金が行われるか、管理画面の表示がどう変わるかをお試しいただくことが可能です。
                            </p>
                            <ol className="list-decimal pl-5 space-y-2 text-xs md:text-sm">
                              <li>
                                Stripeのアカウント登録を開始する際、画面上部に「テストモード」への切り替えスイッチが表示されている場合は、それをONにすることでテストモードとして登録を開始できます。
                              </li>
                              <li>
                                テスト用として連携した後は、実際の住民用支払い画面でクレジットカード情報として、以下のStripe公式テスト用カード情報を入力して決済を行います。
                                <div className="bg-gray-50 p-2.5 rounded border border-gray-200 font-mono mt-1 text-[11px] space-y-1">
                                  <div>カード番号: <strong className="text-indigo-600">4242 4242 4242 4242</strong></div>
                                  <div>有効期限: <strong>将来の任意の日付</strong>（例: 12 / 29）</div>
                                  <div>CVC(セキュリティコード): <strong>任意の3桁の数字</strong>（例: 123）</div>
                                  <div>カード名義: <strong>任意の英文字</strong>（例: TARO YAMADA）</div>
                                </div>
                              </li>
                              <li>
                                これにより, <strong>実際にお金が引き落とされることなく</strong>、決済完了の通知がLINEに届いたり、管理画面上のステータスが「完納」に自動で変わる様子を安全に確認できます。テスト完了後は本番用のアカウントで再連携を行ってください。
                              </li>
                            </ol>
                          </div>
                        </details>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

// ファイルの書き換えを実行
const outputContent = content.substring(0, targetStartIdx) + newCodeBlock;
fs.writeFileSync(filePath, outputContent, 'utf8');
console.log("Successfully fixed AdminView.tsx!");
