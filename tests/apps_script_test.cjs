const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const source=JSON.parse(fs.readFileSync(0,'utf8'));
let email='admin@example.invalid',failSheet='';
class Sheet {
  constructor(name){this.name=name;this.values=[];}
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
const book={getSheetByName:n=>sheets[n] || null,insertSheet:n=>sheets[n]=new Sheet(n)};
const context=vm.createContext({console,Date,Math,JSON,Number,String,Object,Array,Set,Error,
  Utilities:{getUuid:()=>crypto.randomUUID()},
  Session:{getActiveUser:()=>({getEmail:()=>email})},
  PropertiesService:{getScriptProperties:()=>({getProperty:key=>key==='SPREADSHEET_ID'?'test':email})},
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
assert.strictEqual(request('bootstrap').kpis.net_sales,270);
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
if(process.env.EXPORT_BULK_SNAPSHOT==='1')console.log('BULK_SNAPSHOT '+JSON.stringify(snapshot()));
