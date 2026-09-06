const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: (name) => mocks[name] || require(name), Date, console });
  return module.exports;
}
const bank = load('lib/systemUsageBankAccount.ts');
const account = { bank_name: 'テスト銀行', bank_branch_name: '本店', bank_account_type: 'ordinary', bank_account_number: '0012345', bank_account_holder: 'テスト' };
function fixture(withAccount = true) {
  const tables = {
    system_usage_billings: [{ id: 1, neighborhood_id: 1, billing_month: '2026-08', status: 'draft', linked_account_count: 2, monthly_household_price: 100, free_push_limit: 0, push_unit_price: 10, tax_rate: 10 }],
    system_usage_payment_profiles: [{ neighborhood_id: 1, payment_method: 'bank_transfer' }],
    neighborhoods: [{ id: 1, name: 'テスト町' }], circulars: [{ neighborhood_id: 1, created_at: '2026-08-02T00:00:00Z', is_pushed: true }],
    system_usage_bank_account: withAccount ? [{ id: 1, ...account }] : [],
  };
  const client = { from(table) {
    let filters = [], mutation, single = false;
    const q = {
      select() { return q; }, eq(k, v) { filters.push(r => r[k] === v); return q; },
      gte(k, v) { filters.push(r => r[k] >= v); return q; }, lt(k, v) { filters.push(r => r[k] < v); return q; },
      order() { return q; }, limit() { return q; }, maybeSingle() { single = true; return q; }, single() { single = true; return q; },
      update(value) { mutation = rows => rows.forEach(r => Object.assign(r, value)); return q; },
      upsert(value) { mutation = () => { const rows = tables[table]; let row = rows.find(r => r.neighborhood_id === value.neighborhood_id); if (!row) rows.push(row = {}); Object.assign(row, value); }; return q; },
      then(resolve) { const rows = (tables[table] || []).filter(r => filters.every(f => f(r))); if (mutation) mutation(rows); return Promise.resolve({ data: single ? rows[0] || null : rows, error: null }).then(resolve); },
    }; return q;
  } };
  let stripeCalls = 0;
  const server = load('lib/systemUsageBillingServer.ts', {
    '@/lib/systemUsageBankAccount': bank,
    '@/lib/stripeConnectServer': { createWebhookSupabaseClient: () => client, createStripeClient: () => { stripeCalls++; throw new Error('Unexpected Stripe call'); } },
  });
  return { server, client, tables, stripeCalls: () => stripeCalls };
}
(async () => {
  assert.equal(bank.validateBankAccount({ ...account, bank_account_number: '００１２３４５' }).bank_account_number, '0012345');
  assert.throws(() => bank.validateBankAccount({ ...account, bank_account_number: '123' }));
  assert.throws(() => bank.validateBankAccount({ ...account, bank_account_type: 'invalid' }));
  const f = fixture();
  await f.server.setSystemUsagePaymentMethod(f.client, 1, 'bank_transfer');
  await f.server.issueSystemUsageInvoices('2026-08');
  const bill = f.tables.system_usage_billings[0];
  assert.equal(f.stripeCalls(), 0);
  assert.equal(bill.status, 'open');
  assert.equal(bill.total_amount, 231);
  assert.equal(bill.due_date, '2026-09-10T14:59:59.000Z');
  assert.equal(bill.bank_account_snapshot.bank_account_number, '0012345');
  f.tables.system_usage_bank_account[0].bank_account_number = '9999999';
  await f.server.issueSystemUsageInvoices('2026-08');
  assert.equal(bill.bank_account_snapshot.bank_account_number, '0012345');
  const missing = fixture(false);
  await missing.server.issueSystemUsageInvoices('2026-08');
  assert.equal(missing.tables.system_usage_billings[0].status, 'bank_account_required');
  assert.equal(missing.stripeCalls(), 0);
  const paid = fixture(); paid.tables.system_usage_billings[0].status = 'paid';
  const result = await paid.server.issueSystemUsageInvoices('2026-08');
  assert.equal(result.results[0].status, 'skipped');
  console.log('PASS: direct bank billing, deadline, immutable destination, validation, missing account, paid/retry protection; no Stripe calls.');
})().catch(error => { console.error(error); process.exitCode = 1; });
