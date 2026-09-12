const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function fixture(){
  let event,latestInvoice,checkoutResource,writes=0,rpcCalls=0;
  const tables={fee_records:[{id:'fee1',neighborhood_id:1,fiscal_year:2026,paid_amount:0,expected_amount:1000}],neighborhoods:[{id:1,stripe_account_id:'acct_town'}],fee_year_closures:[],fee_stripe_payments:[],fee_year_post_lock_payments:[],system_usage_billings:[{id:'bill1',neighborhood_id:1,stripe_customer_id:'cus_town',stripe_invoice_id:'in_1',status:'open'}]};
  const db={from(table){const filters=[];let action=null,one=false;const q={select(){return q},eq(k,v){filters.push(row=>String(row[k])===String(v));return q},limit(){return q},single(){one=true;return q},maybeSingle(){one=true;return q},update(data){action=rows=>{writes++;rows.forEach(row=>Object.assign(row,data))};return q},upsert(data,options){action=()=>{writes++;const old=tables[table].find(row=>row[options.onConflict]===data[options.onConflict]);if(!old)tables[table].push(data);else if(!options.ignoreDuplicates)Object.assign(old,data)};return q},then(resolve){const rows=(tables[table]||[]).filter(row=>filters.every(f=>f(row)));if(action)action(rows);return Promise.resolve({data:one?rows[0]||null:rows,error:null}).then(resolve)}};return q},async rpc(name,args){assert.equal(name,'record_stripe_fee_payment');rpcCalls++;if(!tables.fee_stripe_payments.some(row=>row.stripe_payment_intent_id===args.p_payment_intent)){tables.fee_stripe_payments.push({stripe_payment_intent_id:args.p_payment_intent,fee_record_id:args.p_fee_id,amount:args.p_amount});tables.fee_records[0].paid_amount+=args.p_amount}return {error:null}}};
  class Stripe{constructor(key,options){assert.equal(options.apiVersion,'2025-02-24.acacia');this.accounts={retrieve:async id=>({id,charges_enabled:true,payouts_enabled:true,details_submitted:true})};this.checkout={sessions:{retrieve:async(id,params,options)=>{assert.equal(id,event.data.object.id);assert.equal(options?.stripeAccount,event.account || undefined);return checkoutResource || event.data.object}}};this.webhooks={constructEvent:()=>event};this.paymentIntents={retrieve:async()=>({latest_charge:null})};this.invoices={retrieve:async()=>latestInvoice}}}
  const module={exports:{}};
  const mocks={'stripe':Stripe,'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},'@/lib/stripeConnectServer':{createWebhookSupabaseClient:()=>db},'@/lib/paypayServer':{payPayCapabilityStatus:()=> 'inactive'}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('app/api/webhooks/stripe/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,{module,exports:module.exports,require:name=>mocks[name]||require(name),process:{env:{STRIPE_SECRET_KEY:'test-placeholder',STRIPE_WEBHOOK_SECRET:'test-placeholder'}},console,Date});
  const notify=(type,session,account='acct_town',signature=true)=>{event={type,account,data:{object:session}};return module.exports.POST({text:async()=>'',headers:{get:()=>signature?'signed-test':null}})};
  return {tables,notify,setCheckout:value=>{checkoutResource=value},setInvoice:value=>{latestInvoice=value},writes:()=>writes,rpcCalls:()=>rpcCalls};
}
(async()=>{
  const session={id:'cs_1',mode:'payment',payment_status:'unpaid',payment_intent:'pi_1',amount_total:1000,currency:'jpy',metadata:{payment_source:'fee_records',fee_record_id:'fee1',neighborhood_id:'1'}};
  const f=fixture();
  assert.equal((await f.notify('checkout.session.completed',session)).body.awaitingPayment,true);assert.equal(f.rpcCalls(),0);assert.equal(f.writes(),0);
  assert.equal((await f.notify('checkout.session.completed',session,'acct_town',false)).status,400);
  const paid={...session,payment_status:'paid'};
  assert.equal((await f.notify('checkout.session.async_payment_succeeded',paid,'acct_other')).status,400);assert.equal(f.rpcCalls(),0);
  await f.notify('checkout.session.async_payment_succeeded',paid);await f.notify('checkout.session.completed',paid);
  assert.equal(f.tables.fee_records[0].paid_amount,1000);assert.equal(f.tables.fee_stripe_payments.length,1);
  f.tables.fee_year_closures.push({id:1,neighborhood_id:1,fiscal_year:2026});await f.notify('checkout.session.async_payment_succeeded',paid);
  assert.equal(f.tables.fee_year_post_lock_payments.length,0,'replay after year closure is not a new late payment');
  const late=fixture();late.tables.fee_year_closures.push({id:1,neighborhood_id:1,fiscal_year:2026});await late.notify('checkout.session.async_payment_succeeded',paid);
  late.tables.fee_year_post_lock_payments[0].status='reviewed';await late.notify('checkout.session.async_payment_succeeded',paid);
  assert.equal(late.tables.fee_year_post_lock_payments[0].status,'reviewed');assert.equal(late.rpcCalls(),0);
  const inv=fixture();const invoice={id:'in_1',currency:'jpy',customer:'cus_town',status:'paid',amount_paid:1000,status_transitions:{paid_at:1789250000},metadata:{payment_source:'system_usage_billings',system_usage_billing_id:'bill1',neighborhood_id:'1',billing_month:'2026-08'}};
  inv.setInvoice(invoice);await inv.notify('invoice.payment_failed',{...invoice,status:'open'});assert.equal(inv.tables.system_usage_billings[0].status,'open');
  await inv.notify('invoice.payment_failed',{...invoice,status:'open'},null);assert.equal(inv.tables.system_usage_billings[0].status,'paid');
  const newer=fixture();newer.setCheckout(paid);await newer.notify('checkout.session.async_payment_succeeded',{id:'cs_1'});assert.equal(newer.tables.fee_records[0].paid_amount,1000,'newer event snapshots are not used for accounting');await newer.notify('account.updated',{id:'acct_town'});assert.equal(newer.tables.neighborhoods[0].stripe_charges_enabled,true);
  console.log('PASS: unpaid Checkout, delayed success, duplicate notification, ownership, signature required, closed-year review, latest invoice status.');
})().catch(error=>{console.error(error);process.exitCode=1});
