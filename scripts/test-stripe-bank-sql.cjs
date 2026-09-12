// PGLITE_MODULE may point to an isolated installation of @electric-sql/pglite.
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE system_usage_payment_profiles(neighborhood_id bigint, payment_method text);
    CREATE TABLE neighborhood_fee_settings(neighborhood_id bigint, cash_enabled boolean, stripe_card_enabled boolean, bank_transfer_enabled boolean, stripe_paypay_enabled boolean);
    INSERT INTO neighborhood_fee_settings VALUES(1,false,false,true,false);
    CREATE TABLE fee_records(id bigint PRIMARY KEY, neighborhood_id bigint, fiscal_year integer, paid_amount_cash integer, paid_amount_stripe integer, paid_amount integer, expected_amount integer, billing_amount integer, amount integer, payment_method text, last_payment_method text, status text, stripe_payment_intent_id text, paid_at timestamptz);
    CREATE TABLE fee_year_closures(neighborhood_id bigint,fiscal_year integer);
    INSERT INTO fee_records(id,neighborhood_id,fiscal_year,paid_amount_cash,paid_amount_stripe,paid_amount,expected_amount) VALUES(1,1,2026,200,0,200,1000),(2,1,2025,0,0,0,500);
  `);
  await db.exec(fs.readFileSync('supabase/migrations/202609120001_stripe_bank_transfers.sql','utf8'));
  const query = async sql => (await db.query(sql)).rows;
  assert.equal((await query('SELECT stripe_bank_transfer_enabled FROM neighborhood_fee_settings'))[0].stripe_bank_transfer_enabled, true);
  await db.exec(`SELECT record_stripe_fee_payment('1','pi_first',300);`);
  assert.equal((await query('SELECT status FROM fee_records WHERE id=1'))[0].status, 'partial');
  await db.exec(`SELECT record_stripe_fee_payment('1','pi_second',500); SELECT record_stripe_fee_payment('1','pi_first',300); SELECT record_stripe_fee_payment('1','pi_second',500);`);
  const fee = (await query('SELECT * FROM fee_records WHERE id=1'))[0];
  assert.equal(fee.paid_amount,1000); assert.equal(fee.paid_amount_cash,200); assert.equal(fee.status,'paid');
  assert.equal((await query('SELECT count(*)::int n FROM fee_stripe_payments'))[0].n,2);
  await assert.rejects(()=>db.exec(`SELECT record_stripe_fee_payment('2','pi_first',300)`),/identity mismatch/);
  await assert.rejects(()=>db.exec(`SELECT record_stripe_fee_payment('1','pi_invalid',-10)`),/Invalid payment/);
  await db.exec(`INSERT INTO fee_year_closures VALUES(1,2025)`);
  await assert.rejects(()=>db.exec(`SELECT record_stripe_fee_payment('2','pi_closed',500)`),/post-lock/);
  assert.equal((await query("SELECT count(*)::int n FROM fee_stripe_payments WHERE stripe_payment_intent_id='pi_closed'"))[0].n,0);
  for (const role of ['anon','authenticated']) {
    await db.exec(`SET ROLE ${role}`);
    await assert.rejects(()=>db.exec(`SELECT record_stripe_fee_payment('1','pi_forbidden',1)`),/permission denied/);
    await assert.rejects(()=>db.exec(`SELECT * FROM fee_stripe_customers`),/permission denied/);
    await db.exec('RESET ROLE');
  }
  await db.close();
  console.log('PASS: PostgreSQL migration, partial/full payment, out-of-order duplicates, cash preservation, identity mismatch, closed year, service-only access.');
})().catch(error=>{console.error(error);process.exitCode=1});
