const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => mocks[name] || require(name), Date, console });
  return module.exports;
}
const bank = load('lib/systemUsageBankAccount.ts');
const issuerHelpers = load('lib/systemUsageIssuer.ts');
const issuer = { postal_code: '123-4567', address: '東京都テスト区1-2-3', company_name: 'テスト株式会社', phone: '03-1234-5678', registration_number: 'T1234567890123' };
const rates = load('lib/systemUsageRates.ts');
const account = { bank_name: 'テスト銀行', bank_code: '0001', bank_branch_code: '001', bank_branch_name: '本店', bank_account_type: 'ordinary', bank_account_number: '0012345', bank_account_holder: 'テスト' };
function fixture(withAccount = true) {
  const tables = {
    system_usage_billings: [{ id: 1, neighborhood_id: 1, billing_month: '2026-08', status: 'draft', snapshot_at: '2026-08-16T00:00:00Z', linked_account_count: 2, monthly_household_price: 100, free_push_limit: 0, push_unit_price: 10, tax_rate: 10 }],
    system_usage_payment_profiles: [{ neighborhood_id: 1, payment_method: 'bank_transfer' }],
    neighborhoods: [{ id: 1, name: 'テスト町' }], circulars: [{ neighborhood_id: 1, created_at: '2026-08-02T00:00:00Z', is_pushed: true }],
    resident_rosters: [{ neighborhood_id: 1, user_auth_id: 'user' }],
    system_usage_rate_versions: [{ id: 1, effective_month: '2026-08', monthly_household_price: 60, free_push_limit: 200, push_unit_price: 3, tax_rate: 10 }, { id: 2, effective_month: '2026-10', monthly_household_price: 80, free_push_limit: 200, push_unit_price: 3, tax_rate: 10 }],
    system_usage_bank_account: withAccount ? [{ id: 1, ...account, issuer: { ...issuer } }] : [],
  };
  const client = { from(table) {
    let filters = [], mutation, single = false;
    const q = {
      select() { return q; }, eq(k, v) { filters.push(r => r[k] === v); return q; },
      gte(k, v) { filters.push(r => r[k] >= v); return q; }, lt(k, v) { filters.push(r => r[k] < v); return q; },
      order() { return q; }, limit() { return q; }, maybeSingle() { single = true; return q; }, single() { single = true; return q; },
      update(value) { mutation = rows => rows.forEach(r => Object.assign(r, value)); return q; },
      upsert(value) { filters.push(r => r.neighborhood_id === value.neighborhood_id && (!value.billing_month || r.billing_month === value.billing_month)); mutation = () => { const rows = tables[table]; let row = rows.find(r => r.neighborhood_id === value.neighborhood_id && (!value.billing_month || r.billing_month === value.billing_month)); if (!row) rows.push(row = { id: rows.length + 1 }); Object.assign(row, value); }; return q; },
      then(resolve) { let rows = (tables[table] || []).filter(r => filters.every(f => f(r))); if (mutation) { mutation(rows); rows = (tables[table] || []).filter(r => filters.every(f => f(r))); } return Promise.resolve({ data: single ? rows[0] || null : rows, error: null }).then(resolve); },
    }; return q;
  } };
  let stripeCalls = 0;
  const server = load('lib/systemUsageBillingServer.ts', {
    '@/lib/systemUsageBankAccount': bank,
    '@/lib/systemUsageRates': rates,
    '@/lib/stripeConnectServer': { createWebhookSupabaseClient: () => client, createStripeClient: () => { stripeCalls++; throw new Error('Unexpected Stripe call'); } },
  });
  return { server, client, tables, stripeCalls: () => stripeCalls };
}
(async () => {
  assert.equal(issuerHelpers.validateInvoiceIssuer({ ...issuer, postal_code: '１２３４５６７', registration_number: 'ｔ１２３４５６７８９０１２３' }).registration_number, issuer.registration_number);
  for (const invalid of [{ postal_code: '123' }, { address: '' }, { company_name: '' }, { phone: 'abc' }, { registration_number: 'T123' }]) {
    assert.throws(() => issuerHelpers.validateInvoiceIssuer({ ...issuer, ...invalid }));
  }
  assert.equal(issuerHelpers.validateInvoiceIssuer({ ...issuer, registration_number: '' }).registration_number, '');
  for (const registration_number of ['T 8370001048069', 'Ｔ　８３７０００１０４８０６９', 't\u200b8370001048069\n']) {
    assert.equal(issuerHelpers.validateInvoiceIssuer({ ...issuer, registration_number }).registration_number, 'T8370001048069');
  }
  assert.throws(() => issuerHelpers.validateInvoiceIssuer({ ...issuer, registration_number: 'T83700010480699' }));
  const issuerMarkup = issuerHelpers.invoiceIssuerHtml(issuer);
  for (const value of Object.values(issuer)) assert.ok(issuerMarkup.includes(value));
  assert.ok(issuerHelpers.invoiceIssuerHtml({ ...issuer, company_name: '<script>alert(1)</script>' }).includes('&lt;script&gt;'));
  assert.equal(issuerHelpers.invoiceIssuerHtml(null), '<div>発行元: el-town</div>');
  for (const auth of [true, false]) {
    let stored;
    const route = load('app/api/system-usage/bank-account/route.ts', {
      'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
      '@/lib/systemAdminServer': { isSystemAdminRequest: () => auth },
      '@/lib/systemUsageBankAccount': bank,
      '@/lib/systemUsageIssuer': issuerHelpers,
      '@/lib/stripeConnectServer': { createWebhookSupabaseClient: () => ({ from: () => ({ upsert: async value => { stored = value; return { error: null }; } }) }) },
    });
    const result = await route.POST({ json: async () => ({ ...account, issuer }) });
    assert.equal(result.status, auth ? 200 : 401);
    assert.equal(stored?.issuer?.company_name, auth ? issuer.company_name : undefined);
    stored = undefined;
    const invalid = await route.POST({ json: async () => ({ ...account, issuer: { ...issuer, postal_code: '123' } }) });
    assert.equal(invalid.status, auth ? 400 : 401);
    assert.equal(stored, undefined);
  }
  assert.equal(bank.validateBankAccount({ ...account, bank_account_number: '００１２３４５' }).bank_account_number, '0012345');
  assert.throws(() => bank.validateBankAccount({ ...account, bank_account_number: '123' }));
  assert.throws(() => bank.validateBankAccount({ ...account, bank_account_type: 'invalid' }));
  assert.throws(() => bank.validateBankAccount({ ...account, bank_code: '12' }));
  assert.throws(() => bank.validateBankAccount({ ...account, bank_branch_code: '1234' }));
  assert.equal(bank.validateBankAccount({ ...account, bank_code: '０３１０', bank_branch_code: '１０２' }).bank_code, '0310');
  const legacy = { ...account, bank_name: 'ＧＭＯあおぞらネット銀行', bank_branch_name: '法人第二営業部', bank_code: undefined, bank_branch_code: undefined };
  assert.match(bank.bankAccountText(legacy), /金融機関コード：0310/);
  assert.match(bank.bankAccountText(legacy), /支店コード：102/);
  const rateFixture = fixture();
  assert.equal(rates.rateForMonth(rateFixture.tables.system_usage_rate_versions, '2026-09').monthly_household_price, 60);
  assert.equal(rates.rateForMonth(rateFixture.tables.system_usage_rate_versions, '2026-10').monthly_household_price, 80);
  assert.equal(rates.rateForMonth(rateFixture.tables.system_usage_rate_versions, '2026-07'), null);
  assert.equal(rates.shiftUsageMonth('2026-12', 1), '2027-01');
  assert.throws(() => rates.validateUsageRate({ effective_month: '2026-13' }));
  await rateFixture.server.snapshotSystemUsage('2026-09', 'manual');
  assert.equal(rateFixture.tables.system_usage_billings[0].monthly_household_price, 100);
  const fresh = fixture(); fresh.tables.system_usage_billings = [];
  await fresh.server.snapshotSystemUsage('2026-10', 'manual');
  assert.equal(fresh.tables.system_usage_billings[0].monthly_household_price, 80);
  assert.equal(fresh.tables.system_usage_billings[0].total_amount, 88);
  assert.equal(fresh.tables.system_usage_billings[0].rate_version_id, 2);
  assert.equal(fresh.tables.system_usage_billings[0].snapshot_source, 'manual');
  fresh.tables.system_usage_rate_versions[1].monthly_household_price = 999;
  await fresh.server.snapshotSystemUsage('2026-10', 'manual');
  assert.equal(fresh.tables.system_usage_billings[0].monthly_household_price, 80);
  const missingRate = fixture(); missingRate.tables.system_usage_billings = [];
  await assert.rejects(() => missingRate.server.snapshotSystemUsage('2026-07', 'manual'), /料金単価が未登録/);
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const Form = load('components/BankAccountForm.tsx', { '@/lib/systemUsageBankAccount': bank, '@/lib/systemUsageIssuer': issuerHelpers }).default;
  const formMarkup = renderToStaticMarkup(React.createElement(Form, { initial: { ...account, issuer }, onSave: async () => {}, onClose() {} }));
  for (const value of Object.values(issuer)) assert.ok(formMarkup.includes(value));
  const registrationInput = formMarkup.match(/<input[^>]*placeholder="T1234567890123"[^>]*>/)[0];
  assert.ok(!/maxlength/i.test(registrationInput), 'Pasted spaces must not truncate the last digit before normalization');
  // Native constraint validation must not silently prevent the submit handler.
  assert.match(formMarkup, /novalidate=""/i);
  for (const scenario of [
    { initial: { ...account, bank_code: '', issuer }, expected: '金融機関コードは4桁で入力してください。' },
    { initial: { ...account, issuer: { ...issuer, company_name: '' } }, expected: '発行元の会社名を200文字以内で入力してください。' },
    { initial: { ...account, issuer }, failure: '保存先に接続できません。', expected: '保存先に接続できません。' },
    { initial: { ...account, issuer }, expected: '銀行口座と発行元情報を保存しました。' },
  ]) {
    const states = [];
    const TestForm = load('components/BankAccountForm.tsx', {
      '@/lib/systemUsageBankAccount': bank, '@/lib/systemUsageIssuer': issuerHelpers,
      react: { ...React, useState: initial => {
        const index = states.length;
        states.push(typeof initial === 'function' ? initial() : initial);
        return [states[index], value => { states[index] = value; }];
      } },
    }).default;
    let saved;
    const tree = TestForm({ initial: scenario.initial, onClose() {}, onSave: async value => {
      if (scenario.failure) throw new Error(scenario.failure);
      saved = value;
    } });
    await tree.props.onSubmit({ preventDefault() {} });
    assert.equal(states[2], scenario.expected);
    assert.equal(states[1], false);
    assert.equal(Boolean(saved), scenario.expected.includes('保存しました'));
  }
  const adminSource = fs.readFileSync('components/AdminView.tsx', 'utf8');
  const documentSource = adminSource.slice(adminSource.indexOf('  const systemBillingPdfHtml ='), adminSource.indexOf('  const openSystemBillingPdf ='));
  const renderDocument = vm.runInNewContext(ts.transpileModule(documentSource + '\nsystemBillingPdfHtml;', { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, { invoiceIssuerHtml: issuerHelpers.invoiceIssuerHtml, bankAccountText: bank.bankAccountText, townName: 'テスト町', yen: value => `${value}円` });
  for (const type of ['invoice', 'receipt']) {
    const html = renderDocument({ id: 1, billing_month: '2026-08', issuer_snapshot: issuer, paid_at: '2026-09-08', bank_account_snapshot: account, payment_method: 'bank_transfer' }, type);
    for (const value of Object.values(issuer)) assert.ok(html.includes(value), `${type} missing ${value}`);
    assert.equal(html.includes('振込先：'), type === 'invoice');
  }
  const Report = load('components/SystemUsageMonthlyReport.tsx', { '@/lib/systemUsageRates': rates }).default;
  const reportRows = ['open', 'paid', 'draft'].map((status, index) => ({
    town: { id: index + 1, name: ['ＡＢＣ町内会', 'ABC自治会', '南町内会'][index] },
    billing: { status }, linked: 0, pushCount: 0, total: 0,
  }));
  for (const [query, unpaid, names] of [
    ['', false, ['ＡＢＣ町内会', 'ABC自治会', '南町内会']],
    [' abc ', false, ['ＡＢＣ町内会', 'ABC自治会']],
    ['', true, ['ＡＢＣ町内会']],
    ['南', true, []],
  ]) {
    const filterState = [query, unpaid];
    const FilteredReport = load('components/SystemUsageMonthlyReport.tsx', {
      '@/lib/systemUsageRates': rates,
      react: { ...React, useState: () => [filterState.shift(), () => {}] },
    }).default;
    const html = renderToStaticMarkup(React.createElement(FilteredReport, {
      month: '2026-08', rows: reportRows, loading: false, busy: false,
      enabled: false, manualEnabled: true, error: '', onMonth() {}, onRun() {}, onPaid() {},
    }));
    for (const row of reportRows) assert.equal(html.includes(row.town.name), names.includes(row.town.name));
    assert.equal(html.includes('該当する町内会・自治会はありません。'), names.length === 0);
  }
  const markup = renderToStaticMarkup(React.createElement(Report, { month: '2026-08', rows: [], loading: false, busy: false, enabled: false, manualEnabled: true, error: '', onMonth() {}, onRun() {}, onPaid() {} }));
  assert.ok(markup.includes('2026年8月利用分'));
  assert.ok(markup.includes('2026年9月請求'));
  assert.ok(markup.includes('2026年9月10日'));
  for (const auth of [true, false]) {
    let inserted;
    const route = load('app/api/system-usage/rates/route.ts', {
      'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
      '@/lib/systemAdminServer': { isSystemAdminRequest: () => auth },
      '@/lib/systemUsageRates': rates,
      '@/lib/stripeConnectServer': { createWebhookSupabaseClient: () => ({ from: () => ({ insert: async value => { inserted = value; return { error: null }; } }) }) },
    });
    const result = await route.POST({ json: async () => ({ effective_month: '2026-10', monthly_household_price: '80', free_push_limit: '200', push_unit_price: '3', tax_rate: '10', change_reason: '単価改定' }) });
    assert.equal(result.status, auth ? 200 : 401);
    assert.equal(Boolean(inserted), auth);
  }
  const f = fixture();
  await f.server.setSystemUsagePaymentMethod(f.client, 1, 'bank_transfer');
  await f.server.issueSystemUsageInvoices('2026-08');
  const bill = f.tables.system_usage_billings[0];
  assert.equal(f.stripeCalls(), 0);
  assert.equal(bill.status, 'open');
  assert.equal(bill.total_amount, 231);
  assert.equal(bill.due_date, '2026-09-10T14:59:59.000Z');
  assert.equal(bill.bank_account_snapshot.bank_account_number, '0012345');
  assert.equal(bill.bank_account_snapshot.bank_code, '0001');
  assert.equal(bill.bank_account_snapshot.bank_branch_code, '001');
  assert.equal(bill.issuer_snapshot.company_name, issuer.company_name);
  assert.equal(bill.issuer_snapshot.registration_number, issuer.registration_number);
  f.tables.system_usage_bank_account[0].issuer = { ...issuer, company_name: '変更後の会社' };
  f.tables.system_usage_bank_account[0].bank_account_number = '9999999';
  await f.server.issueSystemUsageInvoices('2026-08');
  assert.equal(bill.bank_account_snapshot.bank_account_number, '0012345');
  assert.equal(bill.issuer_snapshot.company_name, issuer.company_name);
  const zero = fixture();
  zero.tables.system_usage_billings[0].monthly_household_price = 0;
  zero.tables.system_usage_billings[0].push_unit_price = 0;
  await zero.server.issueSystemUsageInvoices('2026-08');
  assert.equal(zero.tables.system_usage_billings[0].status, 'paid');
  assert.equal(zero.tables.system_usage_billings[0].issuer_snapshot.company_name, issuer.company_name);
  const missing = fixture(false);
  await missing.server.issueSystemUsageInvoices('2026-08');
  assert.equal(missing.tables.system_usage_billings[0].status, 'bank_account_required');
  assert.equal(missing.stripeCalls(), 0);
  const manual = fixture();
  await manual.server.issueSystemUsageInvoices('2026-08', { bankTransferOnly: true });
  assert.equal(manual.tables.system_usage_billings[0].status, 'open');
  assert.equal(manual.stripeCalls(), 0);
  for (const price of [100, 0]) {
    const card = fixture();
    card.tables.system_usage_payment_profiles[0].payment_method = 'card';
    card.tables.system_usage_billings[0].monthly_household_price = price;
    const cardResult = await card.server.issueSystemUsageInvoices('2026-08', { bankTransferOnly: true });
    assert.equal(cardResult.results[0].status, 'card_billing_disabled');
    assert.equal(card.tables.system_usage_billings[0].status, 'draft');
    assert.equal(card.stripeCalls(), 0);
  }
  const noMethod = fixture(); noMethod.tables.system_usage_payment_profiles.length = 0;
  const noMethodResult = await noMethod.server.issueSystemUsageInvoices('2026-08', { bankTransferOnly: true });
  assert.equal(noMethodResult.results[0].status, 'payment_method_required');
  assert.equal(noMethod.stripeCalls(), 0);
  for (const auth of ['admin', 'cron', 'none']) {
    const calls = [];
    const route = load('app/api/system-usage/billing-run/route.ts', {
      'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status || 200 }) } },
      '@/lib/systemAdminServer': { isSystemAdminRequest: () => auth === 'admin', isSystemBillingCronRequest: () => auth === 'cron', isSystemBillingEnabled: () => false },
      '@/lib/systemUsageBillingServer': { defaultSystemUsageBillingMonth: () => '2026-08', snapshotSystemUsage: async () => { calls.push('snapshot'); return {}; }, issueSystemUsageInvoices: async (month, options) => { calls.push(options); return {}; } },
    });
    const result = await route.POST({ json: async () => ({ mode: 'invoice', billingMonth: '2026-08', bankTransferOnly: false }) });
    assert.equal(result.status, auth === 'admin' ? 200 : auth === 'cron' ? 503 : 401);
    if (auth === 'admin') {
      assert.equal(calls[0].bankTransferOnly, true);
      const snapshot = await route.POST({ json: async () => ({ mode: 'snapshot', billingMonth: '2026-08' }) });
      assert.equal(snapshot.status, 200);
      assert.equal(calls[1], 'snapshot');
    } else assert.equal(calls.length, 0);
  }
  const paid = fixture(); paid.tables.system_usage_billings[0].status = 'paid';
  const result = await paid.server.issueSystemUsageInvoices('2026-08');
  assert.equal(result.results[0].status, 'skipped');
  console.log('PASS: direct bank billing, deadline, immutable destination, validation, missing account, paid/retry protection; no Stripe calls.');
})().catch(error => { console.error(error); process.exitCode = 1; });
