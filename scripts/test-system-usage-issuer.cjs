const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function load(file,mocks={}){const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,{module,exports:module.exports,require:name=>mocks[name]||require(name),Date});return module.exports}
const helpers=load('lib/systemUsageIssuer.ts');
const issuer={company_name:'発行元テスト株式会社',postal_code:'１２３４５６７',address:'東京都テスト区1-2-3',phone:'03-1234-5678',registration_number:'Ｔ １２３４５６７８９０１２３'};
(async()=>{
  for(const authorized of [false,true]){
    let written;let queries=0;
    const row={issuer:null,bank_account_number:'0012345'};
    const q={select(){return q},eq(key,value){assert.equal(key,'id');assert.equal(value,1);return q},update(value){written=value;Object.assign(row,value);return q},maybeSingle:async()=>({data:row,error:null})};
    const route=load('app/api/system-usage/issuer/route.ts',{'next/server':{NextResponse:{json:(body,options)=>({body,status:options?.status||200})}},'@/lib/systemAdminServer':{isSystemAdminRequest:()=>authorized},'@/lib/stripeConnectServer':{createWebhookSupabaseClient:()=>({from:table=>{queries++;assert.equal(table,'system_usage_bank_account');return q}})},'@/lib/systemUsageIssuer':helpers});
    const result=await route.POST({json:async()=>({issuer,bank_account_number:'9999999'})});
    assert.equal(result.status,authorized?200:401);
    if(authorized){assert.equal(written.issuer.postal_code,'123-4567');assert.equal(written.issuer.registration_number,'T1234567890123');assert.deepEqual(Object.keys(written).sort(),['issuer','updated_at']);assert.equal(row.bank_account_number,'0012345');assert.equal((await route.GET({})).body.issuer.company_name,issuer.company_name);written=undefined;assert.equal((await route.POST({json:async()=>({issuer:{...issuer,company_name:''}})})).status,400);assert.equal(written,undefined)}else{await route.GET({});assert.equal(queries,0)}
  }
  const React=require('react'),{renderToStaticMarkup}=require('react-dom/server');
  const Form=load('components/InvoiceIssuerForm.tsx',{'@/lib/systemUsageIssuer':helpers}).default;
  const html=renderToStaticMarkup(React.createElement(Form,{initial:issuer,onSave:async()=>{},onClose(){}}));
  assert.match(html,/発行元情報を保存/);assert.match(html,/会社名/);assert.match(html,/novalidate/i);assert.doesNotMatch(html,/銀行|支店|口座番号/);
  console.log('PASS: issuer-only form, system-admin authorization, validation, legacy bank fields preserved.');
})().catch(e=>{console.error(e);process.exitCode=1});
