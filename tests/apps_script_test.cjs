const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const source=JSON.parse(fs.readFileSync(0,'utf8'));
let email='admin@example.invalid',failSheet='';
class Sheet {
  constructor(name){this.name=name;this.values=[];}
  getName(){return this.name;}
  getLastRow(){return this.values.length;}
  getDataRange(){return this.getRange(1,1,Math.max(this.values.length,1),Math.max(...this.values.map(r=>r.length),1));}
  appendRow(row){this.values.push(row);return this;}
  clearContents(){if(this.name===failSheet){failSheet='';throw new Error('Simulated interruption');}this.values=[];return this;}
  hideSheet(){return this;}
  setFrozenRows(){return this;}
  getRange(row,col,height=1,width=1){const sheet=this;return {
    getValues(){return Array.from({length:height},(_,i)=>Array.from({length:width},(_,j)=>sheet.values[row+i-1]?.[col+j-1] ?? ''));},
    getValue(){return sheet.values[row-1]?.[col-1] ?? '';},
    setValues(values){values.forEach((line,i)=>line.forEach((value,j)=>{sheet.values[row+i-1] ||= [];sheet.values[row+i-1][col+j-1]=typeof value==='string' && value.startsWith("'")?value.slice(1):value;}));return this;},
    setValue(value){return this.setValues([[value]]);}
  };}
}
const sheets={};
let backupCount=0;
const book={getSheetByName:n=>sheets[n] || null,insertSheet:n=>sheets[n]=new Sheet(n),copy:()=>{backupCount++;return {getId:()=>'synthetic-backup-id'};}};
const initialProperties={};
const context=vm.createContext({console,Date,Math,JSON,Number,String,Object,Array,Set,Error,
  Utilities:{getUuid:()=>crypto.randomUUID(),formatDate:(value,zone)=>{assert.strictEqual(zone,'Asia/Kolkata');return new Date(value.getTime()+19800000).toISOString().slice(0,10);}},
  Session:{getActiveUser:()=>({getEmail:()=>email})},
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='SPREADSHEET_ID'?'test':key==='BOOTSTRAP_ADMIN_EMAIL'?email:initialProperties[key] || null,setProperty:(key,value)=>initialProperties[key]=value})},
  LockService:{getScriptLock:()=>({waitLock(){},releaseLock(){}})},
  SpreadsheetApp:{openById:()=>book,flush(){}}
});
for(const name of fs.readdirSync('apps-script').filter(n=>n.endsWith('.gs'))){vm.runInContext(fs.readFileSync('apps-script/'+name,'utf8'),context,{filename:name});}
const model=vm.runInContext('MODEL',context);
for(const table of Object.keys(model)){
  const sheet=book.insertSheet(table),headers=model[table].map(f=>f.name);
  sheet.values=[headers,...(source[table] || []).map(r=>headers.map(h=>r[h] ?? ''))];
}
function request(action,payload){return context.api(action,{...payload,request_id:payload?.request_id || crypto.randomUUID()});}
function snapshot(){return context.snapshot_();}
const codeSpecs=vm.runInContext('DISPLAY_CODES',context);
// Simulate the deployed workbook before display columns existed.
for(const [table,spec] of Object.entries(codeSpecs)){
  const index=sheets[table].values[0].indexOf(spec[0]);
  for(const row of sheets[table].values)row.splice(index,1);
}
assert.strictEqual(request('bootstrap').kpis.net_sales,270);
assert.strictEqual(snapshot().customers[0].customer_id,'CUS-001','Migration replaced an internal customer key');
assert.strictEqual(snapshot().customers[0].customer_code,'CUS-0001');
assert.strictEqual(snapshot().products[0].product_id,'PRD-001','Migration replaced an internal product key');
assert.strictEqual(snapshot().products[0].product_code,'PRD-0001');
// Sheets Date cells must retain India's date instead of becoming a UTC date.
const dateColumn=sheets.purchase_orders.values[0].indexOf('order_date');
const oldDate=sheets.purchase_orders.values[1][dateColumn];
sheets.purchase_orders.values[1][dateColumn]=new Date('2026-09-01T18:30:00Z');
assert.strictEqual(snapshot().purchase_orders[0].order_date,'2026-09-02');
sheets.purchase_orders.values[1][dateColumn]=oldDate;
const migratedVersion=snapshot().customers[0].version;
assert.strictEqual(migratedVersion,Number(source.customers[0].version)+1);
assert.strictEqual(snapshot().customers[0].version,migratedVersion,'Rereading repeatedly changed the version');
assert.strictEqual(backupCount,1,'Migration did not create exactly one workbook backup');
const createdCustomer=request('saveMaster',{table:'customers',record:{customer_type:'individual',full_name:'Synthetic extra customer',status:'active',customer_code:'CUS-9999'}}).result;
assert.strictEqual(createdCustomer.code,'CUS-0002','Client supplied a code or the sequence duplicated one');
const extra=snapshot().customers.find(r=>r.customer_id===createdCustomer.id);
request('saveMaster',{table:'customers',record:{...extra,full_name:'Synthetic edited customer',customer_code:'CUS-9999'},version:extra.version});
assert.strictEqual(snapshot().customers.find(r=>r.customer_id===createdCustomer.id).customer_code,'CUS-0002','An edit replaced the permanent code');
// Rejected snapshots must not reach the durable journal or change source data.
for (const mutate of [
  d=>d.purchase_order_items[0].unit_cost=1.001,
  d=>d.purchase_order_items[0].ordered_qty=2147483648,
  d=>d.purchase_orders[0].order_date='2026-02-30',
  d=>d.sales_order_items[0].discount=-1,
  d=>d.goods_receipt_items[0].accepted_qty=999,
  d=>d.inventory_balances[0].quantity_on_hand++,
  d=>d.return_items[0].order_line_no=999,
  d=>d.goods_receipt_items[0].received_qty=999,
  d=>d.inventory_movements[0].quantity_change=0,
  d=>d.payments[0].amount=99999,
  d=>d.refunds[0].amount=99999,
  d=>{d.return_items[0].condition='damaged';d.return_items[0].restock=true;},
]) {
  const candidate=snapshot(); mutate(candidate);
  assert.throws(()=>context.validateSnapshot_(candidate));
}
const totals=snapshot(), originalKpis=context.dashboard_(totals);
totals.sales_orders[0].is_active=false;
assert.strictEqual(context.dashboard_(totals).net_sales,0,'Inactive orders remained in portal KPIs');
assert.strictEqual(context.dashboard_(totals).orders,0);
assert.strictEqual(originalKpis.net_sales,270);
// Draft receipt quantities must not close a purchase prematurely.
const receiptScenario=snapshot();
const draftPo=context.purchase_(receiptScenario,{supplier_id:'SUP-001',store_id:'STR-001',items:[{product_id:'PRD-001',quantity:5,unit_cost:200}]}).id;
receiptScenario.goods_receipts.push(context.stamp_({receipt_id:'draft-receipt',po_id:draftPo,received_date:new Date().toISOString(),status:'draft'}));
receiptScenario.goods_receipt_items.push(context.stamp_({receipt_id:'draft-receipt',line_no:1,po_line_no:1,received_qty:3,accepted_qty:0}));
context.receive_(receiptScenario,{po_id:draftPo,items:[{po_line_no:1,received_qty:2,accepted_qty:2}]});
assert.strictEqual(receiptScenario.purchase_orders.find(p=>p.po_id===draftPo).status,'partial','Draft receipt incorrectly completed purchase');
const product=snapshot().products[0];
assert.throws(()=>request('saveMaster',{table:'products',record:{...product,product_id:'',sku:'PAPER-A4'}}),/Duplicate/);
request('saveMaster',{table:'products',record:{...product,selling_price:350},version:product.version});
assert.strictEqual(Number(snapshot().sales_order_items[0].unit_price),300,'Old order price changed');
assert.strictEqual(snapshot().product_price_history.length,2);
assert.throws(()=>request('sale',{customer_id:'CUS-001',store_id:'STR-001',items:[{product_id:'PRD-001',quantity:100}]}),/Insufficient/);
assert.strictEqual(snapshot().sales_orders.length,1,'Rejected order was committed');
const id=crypto.randomUUID(),sale={request_id:id,customer_id:'CUS-001',store_id:'STR-001',items:[{product_id:'PRD-001',quantity:1}]};
request('sale',sale);request('sale',sale);
assert.strictEqual(snapshot().sales_orders.length,2,'Duplicate retry created a sale');
assert.strictEqual(Number(snapshot().inventory_balances[0].quantity_on_hand),8);
assert.throws(()=>request('returnOrder',{order_id:'SO-001',reason:'test',items:[{order_line_no:1,returned_qty:2,condition:'saleable',restock:true}]}),/exceeds/);
email='unknown@example.invalid';assert.throws(()=>request('bootstrap'),/not authorized/);email='admin@example.invalid';
// Interrupt after PREPARED is durable, then let the next reader replay the journal.
failSheet='products';
const adjust={request_id:crypto.randomUUID(),store_id:'STR-001',product_id:'PRD-001',quantity:2,reason:'Count correction'};
assert.throws(()=>request('adjust',adjust),/Simulated interruption/);
assert.strictEqual(sheets._journal.getRange(1,1).getValue(),'PREPARED');
request('bootstrap');request('adjust',adjust);
assert.strictEqual(Number(snapshot().inventory_balances[0].quantity_on_hand),10,'Recovery or retry applied stock twice');
const po=request('purchase',{supplier_id:'SUP-001',store_id:'STR-001',items:[{product_id:'PRD-001',quantity:5,unit_cost:200}]}).result.id;
request('receive',{po_id:po,items:[{po_line_no:1,received_qty:2,accepted_qty:2}]});
assert.strictEqual(snapshot().purchase_orders.find(p=>p.po_id===po).status,'partial');
assert.throws(()=>request('receive',{po_id:po,items:[{po_line_no:1,received_qty:4,accepted_qty:4}]}),/exceeds/);
request('receive',{po_id:po,items:[{po_line_no:1,received_qty:3,accepted_qty:3}]});
assert.strictEqual(snapshot().purchase_orders.find(p=>p.po_id===po).status,'received');
console.log('Apps Script: price snapshots, duplicates, overselling, returns, receipts, identity, journal recovery passed');
const report=context.loadAndTestDemo();
assert.strictEqual(report.status,'passed');
const demoOrderCount=snapshot().sales_orders.length;
assert.strictEqual(context.loadAndTestDemo().status,'passed');
assert.strictEqual(snapshot().sales_orders.length,demoOrderCount,'Running the demo twice duplicated records');
console.log('Demo loader: preserves existing data, verifies workflow and can be rerun without duplicates');
const beforeBulk=snapshot().sales_orders.length;
const bulk=context.loadSupermarket50();
assert.strictEqual(bulk.additional_sales,50);
assert.strictEqual(bulk.products,30);
assert.strictEqual(bulk.customers,24);
assert.strictEqual(bulk.returns,5);
assert.strictEqual(snapshot().sales_orders.length,beforeBulk+50);
assert.strictEqual(context.loadSupermarket50().additional_sales,50);
assert.strictEqual(snapshot().sales_orders.length,beforeBulk+50,'Bulk rerun duplicated sales');
assert.strictEqual(context.loadAndTestDemo().status,'passed','Bulk loader changed existing test data');
console.log('Bulk supermarket loader:',JSON.stringify(bulk));
// Mock GitHub's REST API and Apps Script utilities to exercise the real exporter.
const zlib=require('zlib');
const properties={GITHUB_OWNER:'test-owner',GITHUB_REPO:'private-superstore',GITHUB_TOKEN:'test-token'};
const propertyStore={getProperty:key=>properties[key] || null,setProperty:(key,value)=>{properties[key]=value;},setProperties:values=>Object.assign(properties,values),deleteProperty:key=>delete properties[key]};
context.PropertiesService={getScriptProperties:()=>({...propertyStore,getProperty:key=>key==='SPREADSHEET_ID'?'test':propertyStore.getProperty(key)})};
context.Session.getEffectiveUser=()=>({getEmail:()=>email || 'admin@example.invalid'});
context.Utilities.DigestAlgorithm={SHA_256:'sha256'};context.Utilities.Charset={UTF_8:'utf8'};
context.Utilities.computeDigest=(_,text)=>Array.from(crypto.createHash('sha256').update(text).digest());
context.Utilities.newBlob=text=>({text});
context.Utilities.gzip=blob=>({getBytes:()=>Array.from(zlib.gzipSync(blob.text))});
context.Utilities.base64Encode=bytes=>Buffer.from(bytes).toString('base64');
let remoteFile=null,privateRepo=true,uploads=0,uploadedSnapshot=null;
context.UrlFetchApp={fetch:(url,options)=>{
  assert.ok(url.startsWith('https://api.github.com/repos/test-owner/private-superstore'));
  assert.strictEqual(options.followRedirects,false);
  assert.strictEqual(options.headers.Authorization,'Bearer test-token');
  let status=200,body;
  if(!url.includes('/contents/'))body={private:privateRepo,default_branch:'main'};
  else if(options.method==='get'){status=remoteFile?200:404;body=remoteFile || {};}
  else{
    const payload=JSON.parse(options.payload);
    assert.strictEqual(payload.branch,'main');
    if(remoteFile)assert.strictEqual(payload.sha,remoteFile.sha);
    uploadedSnapshot=JSON.parse(zlib.gunzipSync(Buffer.from(payload.content,'base64')).toString());
    uploads++;remoteFile={sha:'revision-'+uploads};body={content:remoteFile};
  }
  return {getResponseCode:()=>status,getContentText:()=>JSON.stringify(body)};
}};
assert.strictEqual(context.exportSuperstoreNow().status,'exported');
assert.strictEqual(uploadedSnapshot.format_version,1);
assert.strictEqual(Object.keys(uploadedSnapshot.tables).length,26);
assert.strictEqual(uploadedSnapshot.tables.sales_orders.length,snapshot().sales_orders.length);
assert.strictEqual(context.exportSuperstoreNow().status,'unchanged');
assert.strictEqual(uploads,1,'Unchanged source was uploaded again');
properties.SYNC_LAST_EXPORTED_AT='2000-01-01T00:00:00Z';
assert.strictEqual(context.exportSuperstoreNow().status,'exported','Daily freshness heartbeat was not exported');
privateRepo=false;assert.throws(()=>context.exportSuperstoreNow(),/PRIVATE/);privateRepo=true;
email='unknown@example.invalid';assert.throws(()=>context.exportSuperstoreNow(),/not authorized/);email='admin@example.invalid';
assert.throws(()=>context.scheduledSuperstoreExport_(),/owner mismatch/);
properties.SYNC_TRIGGER_OWNER_EMAIL=email;
email='';assert.strictEqual(context.scheduledSuperstoreExport_().status,'unchanged');email='admin@example.invalid';
console.log('GitHub exporter: private destination, complete gzip snapshot, deduplication, freshness heartbeat, manual and scheduled authorization passed');
const browserScript=fs.readFileSync('apps-script/Partial_CoreJS.html','utf8').match(/<script>([\s\S]*)<\/script>/)[1];
vm.runInContext(browserScript,context,{filename:'Partial_CoreJS.html'});
context.__clientBootstrap=context.bootstrap_(snapshot(),{role:'administrator'});
vm.runInContext('Object.assign(state,__clientBootstrap)',context);
assert.strictEqual(vm.runInContext("visibleColumns('customers')[0]",context),'customer_code');
assert.strictEqual(vm.runInContext("visibleColumns('customers').includes('customer_id')",context),false);
assert.ok(vm.runInContext("labelFor('customers',state.data.customers[0].customer_id)",context).startsWith('CUS-0001'));
assert.ok(vm.runInContext("displayCell('customers','segment_id',state.data.customers[0])",context).startsWith('SEG-'));
assert.ok(vm.runInContext("labelFor('sales_orders',state.data.sales_orders[0].order_id)",context).startsWith('SO-'));
console.log('Display codes: legacy header migration, immutable UUIDs/codes, version updates, new record counters and readable portal references passed');
if(process.env.EXPORT_BULK_SNAPSHOT==='1')console.log('BULK_SNAPSHOT '+JSON.stringify(snapshot()));
