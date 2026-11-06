function validateSnapshot_(data) {
  const references={};
  Object.keys(MODEL).forEach(table=>MODEL[table].forEach(field=>{
    const ref=field.rules.match(/REFERENCES (\w+)\((\w+)\)/);
    if (ref && !references[ref[1]+'.'+ref[2]]) references[ref[1]+'.'+ref[2]]=new Set(data[ref[1]].map(r=>String(r[ref[2]])));
  }));
  Object.keys(MODEL).forEach(table => {
    const seen=Object.create(null);
    data[table].forEach(row => {
      if (COMPOSITE_KEYS[table]) {
        const composite='key:'+JSON.stringify(COMPOSITE_KEYS[table].map(k=>row[k]));
        if (seen[composite]) throw new Error('Duplicate '+table+' key');
        seen[composite]=true;
      }
      MODEL[table].forEach(field => {
        const v=row[field.name], rule=field.rules, blank=v==='' || v===null || v===undefined;
        if (blank && (/NOT NULL|PRIMARY KEY/.test(rule))) throw new Error(table+'.'+field.name+' is required');
        if (blank) return;
        if (field.type==='integer' && (!Number.isSafeInteger(Number(v)) || Number(v)<-2147483648 || Number(v)>2147483647)) throw new Error('Integer required: '+field.name);
        if (/numeric/.test(field.type) && (!Number.isFinite(Number(v)) || Math.abs(Number(v))>=1000000000000 || Math.abs(Number(v)*100-Math.round(Number(v)*100))>0.0001)) throw new Error('Money requires at most two decimal places: '+field.name);
        if (field.type==='date' && (!/^\d{4}-\d{2}-\d{2}$/.test(String(v)) || !Number.isFinite(Date.parse(v)) || new Date(v).toISOString().slice(0,10)!==String(v))) throw new Error('Invalid date: '+field.name);
        if (field.type==='timestamptz' && (!/(Z|[+-]\d{2}:\d{2})$/i.test(String(v)) || !Number.isFinite(Date.parse(v)))) throw new Error('Timestamp with timezone required: '+field.name);
        if (field.type==='boolean' && typeof v !== 'boolean') throw new Error('Boolean required: '+field.name);
        const choices=rule.match(/IN \(([^)]+)\)/);
        if (choices && !choices[1].split(',').map(x=>x.trim().replace(/'/g,'')).includes(String(v))) throw new Error('Invalid '+field.name);
        const ref=rule.match(/REFERENCES (\w+)\((\w+)\)/);
        if (ref && !references[ref[1]+'.'+ref[2]].has(String(v))) throw new Error('Unknown reference: '+field.name);
        if (/PRIMARY KEY|UNIQUE/.test(rule)) {
          const key=field.name+':'+String(v).toLowerCase();
          if (seen[key]) throw new Error('Duplicate '+field.name); seen[key]=true;
        }
        if (/CHECK \(\w+ >= 0\)/.test(rule) && Number(v)<0) throw new Error(field.name+' cannot be negative');
        if (/CHECK \(\w+ > 0\)/.test(rule) && Number(v)<=0) throw new Error(field.name+' must be positive');
        if (/CHECK \(\w+ <> 0\)/.test(rule) && Number(v)===0) throw new Error(field.name+' cannot be zero');
      });
    });
  });
  data.inventory_balances.forEach(r=> { if (Number(r.quantity_reserved)<0 || Number(r.quantity_on_hand)<Number(r.quantity_reserved)) throw new Error('Reserved stock exceeds on-hand'); });
  data.sales_order_items.forEach(r=> { if (Number(r.discount)<0 || Number(r.discount)>Number(r.quantity)*Number(r.unit_price)) throw new Error('Discount exceeds line value'); });
  data.goods_receipt_items.forEach(r=> { if (Number(r.accepted_qty)<0 || Number(r.accepted_qty)>Number(r.received_qty)) throw new Error('Accepted quantity exceeds received quantity'); });
  data.purchase_orders.forEach(r=> { if (r.expected_date && r.expected_date<r.order_date) throw new Error('Expected date precedes order'); });
  data.shipments.forEach(r=> { if (r.delivered_at && r.dispatched_at && Date.parse(r.delivered_at)<Date.parse(r.dispatched_at)) throw new Error('Delivery precedes dispatch'); });
  validateLedgerAndLines_(data);
  validateSettlements_(data);
}

function validateSettlements_(data) {
  const totals=new Map(), paid=new Map(), limits=new Map(), refunded=new Map(), orderRefunds=new Map();
  const add=(map,key,value)=>map.set(key,(map.get(key)||0)+Number(value));
  const orders=new Map(data.sales_orders.map(r=>[r.order_id,r]));
  const returns=new Map(data.returns.map(r=>[r.return_id,r]));
  const lines=new Map(data.sales_order_items.map(r=>[JSON.stringify([r.order_id,Number(r.line_no)]),r]));
  data.sales_order_items.filter(r=>r.is_active!==false).forEach(r=>add(totals,r.order_id,Number(r.quantity)*Number(r.unit_price)-Number(r.discount)+Number(r.tax)));
  data.payments.filter(r=>r.is_active!==false && r.status==='settled').forEach(r=>add(paid,r.order_id,r.amount));
  paid.forEach((amount,id)=>{if (money_(amount)>money_(totals.get(id)||0) || orders.get(id).order_status!=='completed') throw new Error('Settled payment exceeds completed order total');});
  data.return_items.forEach(r=>{
    if (r.restock && r.condition!=='saleable') throw new Error('Damaged merchandise cannot be restocked');
    const header=returns.get(r.return_id);
    const line=lines.get(JSON.stringify([header.order_id,Number(r.order_line_no)]));
    if (r.is_active!==false && header.is_active!==false && header.status==='accepted') add(limits,r.return_id,Number(r.returned_qty)*(Number(line.unit_price)+(Number(line.tax)-Number(line.discount))/Number(line.quantity)));
  });
  data.refunds.filter(r=>r.is_active!==false && r.refund_status==='settled').forEach(r=>{
    add(refunded,r.return_id,r.amount); add(orderRefunds,returns.get(r.return_id).order_id,r.amount);
  });
  refunded.forEach((amount,id)=>{if (money_(amount)>money_(limits.get(id)||0)) throw new Error('Refund exceeds accepted returned value');});
  orderRefunds.forEach((amount,id)=>{if (money_(amount)>money_(paid.get(id)||0)) throw new Error('Refund exceeds settled payments');});
}

function validateLedgerAndLines_(data) {
  const key=(a,b)=>JSON.stringify([a,Number(b)]);
  const receiptHeaders=new Map(data.goods_receipts.map(r=>[r.receipt_id,r]));
  const purchaseLines=new Map(data.purchase_order_items.map(r=>[key(r.po_id,r.line_no),r]));
  const returnHeaders=new Map(data.returns.map(r=>[r.return_id,r]));
  const orders=new Map(data.sales_orders.map(r=>[r.order_id,r]));
  const saleLines=new Map(data.sales_order_items.map(r=>[key(r.order_id,r.line_no),r]));
  const received=new Map(), returned=new Map(), ledger=new Map();
  data.goods_receipt_items.forEach(row=>{
    const header=receiptHeaders.get(row.receipt_id), k=key(header.po_id,row.po_line_no), line=purchaseLines.get(k);
    if (!line) throw new Error('Unknown original purchase line');
    if (header.status==='posted' && header.is_active!==false && row.is_active!==false) {
      received.set(k,(received.get(k)||0)+Number(row.received_qty));
      if (received.get(k)>Number(line.ordered_qty)) throw new Error('Received more than ordered');
    }
  });
  data.return_items.forEach(row=>{
    const header=returnHeaders.get(row.return_id), k=key(header.order_id,row.order_line_no), line=saleLines.get(k);
    if (!line) throw new Error('Unknown original sales line');
    if (header.status==='accepted' && row.is_active!==false && header.is_active!==false) {
      returned.set(k,(returned.get(k)||0)+Number(row.returned_qty));
      if (returned.get(k)>Number(line.quantity) || orders.get(header.order_id).order_status!=='completed') throw new Error('Invalid accepted return quantity or order state');
    }
  });
  data.inventory_movements.filter(r=>r.is_active!==false).forEach(row=>{
    const k=JSON.stringify([row.store_id,row.product_id]);
    ledger.set(k,(ledger.get(k)||0)+Number(row.quantity_change));
  });
  data.inventory_balances.forEach(row=>{
    const k=JSON.stringify([row.store_id,row.product_id]);
    if (Number(row.quantity_on_hand)!==(ledger.get(k)||0)) throw new Error('On-hand quantity differs from movement ledger');
    ledger.delete(k);
  });
  if (Array.from(ledger.values()).some(q=>q!==0)) throw new Error('Movement ledger has no stock balance');
}
function normalizeMaster_(table, input) {
  const row={};
  MODEL[table].forEach(f=> {
    if (DISPLAY_CODES[table] && f.name===DISPLAY_CODES[table][0]) return;
    if (!Object.prototype.hasOwnProperty.call(input,f.name)) return;
    let value=input[f.name];
    if (typeof value==='string') value=value.trim();
    if (value!=='' && /integer|numeric/.test(f.type)) {
      value=number_(value,f.name,0,f.type==='integer');
      if (/numeric/.test(f.type) && (value>=1000000000000 || Math.abs(value*100-Math.round(value*100))>0.0001)) throw new Error(f.name+' requires at most two decimal places');
    }
    row[f.name]=value;
  });
  if (row.sku) row.sku=row.sku.toUpperCase();
  if (row.email) {
    row.email=row.email.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) throw new Error('Invalid email');
  }
  return row;
}
