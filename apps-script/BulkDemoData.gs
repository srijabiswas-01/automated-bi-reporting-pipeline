/** Adds 50 additional, linked SYNTHETIC supermarket sales. Run from the editor. */
function loadSupermarket50() {
  const lock=LockService.getScriptLock(); lock.waitLock(30000);
  try {
    recover_();
    const data=snapshot_(), actor=authorize_(data);
    if (actor.role!=='administrator') throw new Error('Administrator required');
    const marker='b5010000-0000-4000-8000-000000009999';
    const existing=data.audit_logs.find(r=>r.audit_id===marker);
    if (existing) {
      const report=verifySupermarket50_(data);
      console.log(JSON.stringify(report,null,2)); return report;
    }
    let sequence=0, seed=502026;
    function random(max) { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return Math.floor(seed/4294967296*max); }
    const anchor=new Date(now_()); anchor.setUTCHours(12,0,0,0); anchor.setUTCDate(anchor.getUTCDate()-1);
    function at(days,hour) { const d=new Date(anchor); d.setUTCDate(d.getUTCDate()+days); d.setUTCHours(hour || 10,0,0,0); return d.toISOString(); }
    function operation(action,payload,handler,after) {
      const before=JSON.stringify(data), result=handler(data,payload,actor);
      if (after) after(result);
      sequence++;
      const request='b5010000-0000-4000-8000-'+String(sequence).padStart(12,'0');
      audit_(data,actor,action,result,before,request);
      return result.id;
    }
    function master(table,record) { return operation('saveMaster',{table:table,record:record},saveMaster_); }
    const stores=[['Central Market','Pune','West'],['Lake Market','Bengaluru','South'],['City Market','Jaipur','North']].map(s=>master('stores',{store_name:'SYN50 '+s[0],city:s[1],region:s[2],status:'active'}));
    const categories=['Grains & Pulses','Dairy','Fresh Produce','Bakery','Beverages','Snacks','Personal Care','Household Cleaning','Cooking Essentials','Frozen Foods'].map(name=>master('categories',{category_name:'SYN50 '+name,parent_category_id:''}));
    const brands=['Pantry','Fresh','Daily','Home','Harvest','Choice'].map(name=>master('brands',{brand_name:'SYN50 '+name}));
    const segments=['Household','Small Business','Occasional Shopper'].map(name=>master('segments',{segment_name:'SYN50 '+name}));
    const suppliers=Array.from({length:6},(_,i)=>master('suppliers',{supplier_name:'SYN50 Wholesale '+String(i+1).padStart(2,'0'),contact:'Synthetic supplier contact',email:'supplier'+(i+1)+'@example.invalid',lead_time_days:2+i,purchasing_terms:['Net 15','Net 30','On receipt'][i%3],status:'active'}));
    const customers=Array.from({length:24},(_,i)=>master('customers',{customer_type:i%7===0?'business':'individual',full_name:'SYN50 Customer '+String(i+1).padStart(2,'0'),email:'synthetic.customer'+(i+1)+'@example.invalid',phone:'',segment_id:segments[i%segments.length],status:'active'}));
    customers.forEach((id,i)=>master('customer_addresses',{customer_id:id,city:['Pune','Bengaluru','Jaipur'][i%3],state:['Maharashtra','Karnataka','Rajasthan'][i%3],postal_code:['411001','560001','302001'][i%3],country:'IN',address_type:'shipping'}));
    // Category index, product/pack, synthetic unit cost, synthetic selling price.
    const catalogue=[
      [0,'Rice 1 kg',54,68],[0,'Wheat Flour 1 kg',38,49],[0,'Lentils 500 g',56,72],
      [1,'Milk 1 L',48,56],[1,'Yogurt 400 g',34,45],[1,'Butter 100 g',43,55],
      [2,'Bananas 6 pack',30,42],[2,'Potatoes 1 kg',22,32],[2,'Apples 4 pack',85,115],
      [3,'Whole Wheat Bread',31,44],[3,'Dinner Rolls 6 pack',29,40],[3,'Cookies 200 g',35,50],
      [4,'Tea 250 g',94,125],[4,'Coffee 100 g',112,155],[4,'Fruit Juice 1 L',68,95],
      [5,'Chips 150 g',28,40],[5,'Mixed Nuts 200 g',125,175],[5,'Crackers 200 g',32,46],
      [6,'Soap 100 g',23,34],[6,'Toothpaste 150 g',62,89],[6,'Shampoo 200 mL',108,149],
      [7,'Dishwashing Liquid 500 mL',64,92],[7,'Laundry Powder 1 kg',104,145],[7,'Floor Cleaner 1 L',88,125],
      [8,'Cooking Oil 1 L',113,142],[8,'Salt 1 kg',16,24],[8,'Spice Mix 100 g',38,58],
      [9,'Frozen Peas 500 g',61,85],[9,'Frozen Corn 500 g',65,90],[9,'Ice Cream 500 mL',95,140]
    ];
    const products=catalogue.map((p,i)=>master('products',{sku:'SYN50-'+String(i+1).padStart(3,'0'),product_name:'SYN50 '+p[1],category_id:categories[p[0]],brand_id:brands[i%brands.length],gtin:'',unit:'pack',cost_price:p[2],selling_price:p[3],tax_code:'SYNTHETIC-TAX-EXCLUDED',status:'active'}));
    products.forEach((id,i)=>master('product_suppliers',{product_id:id,supplier_id:suppliers[i%6],supplier_sku:'SYN50-SUP-'+String(i+1).padStart(3,'0'),supplier_cost:catalogue[i][2]}));
    // Real purchasing and receipt services create all initial stock and its ledger.
    stores.forEach((store,s)=>suppliers.forEach((supplier,v)=>{
      const indices=products.map((_,i)=>i).filter(i=>i%6===v);
      const quantities=indices.map(i=>35+random(26));
      const po=operation('purchase',{supplier_id:supplier,store_id:store,order_date:at(-62).slice(0,10),expected_date:at(-60).slice(0,10),items:indices.map((i,n)=>({product_id:products[i],quantity:quantities[n],unit_cost:catalogue[i][2]}))},purchase_);
      operation('receive',{po_id:po,items:indices.map((i,n)=>({po_line_no:n+1,received_qty:quantities[n],accepted_qty:quantities[n]}))},receive_,result=>{
        find_(data,'goods_receipts','receipt_id',result.id).received_date=at(-60,8);
        data.inventory_movements.filter(m=>m.reference_id===result.id).forEach(m=>m.occurred_at=at(-60,8));
      });
    }));
    const orderIds=[];
    for (let i=0;i<50;i++) {
      const store=stores[i%3], day=-58+Math.floor(i*58/50), timestamp=at(day,5+random(12));
      const productIndices=[i%30], size=1+random(5);
      while (productIndices.length<size) { const next=random(30); if (!productIndices.includes(next)) productIndices.push(next); }
      const items=productIndices.map(p=>{const qty=1+random(4), discountRate=[0,0,0,0.02,0.05,0.10][random(6)];return {product_id:products[p],quantity:qty,discount:money_(qty*catalogue[p][3]*discountRate),tax:0};});
      const order=operation('sale',{customer_id:customers[i<24?i:random(24)],store_id:store,channel:i%5===0?'online':'store',items:items},sale_,result=>{
        find_(data,'sales_orders','order_id',result.id).order_date=timestamp;
        data.inventory_movements.filter(m=>m.reference_id===result.id).forEach(m=>m.occurred_at=timestamp);
      });
      orderIds.push(order);
      const lines=data.sales_order_items.filter(l=>l.order_id===order);
      const total=money_(lines.reduce((sum,l)=>sum+Number(l.quantity)*Number(l.unit_price)-Number(l.discount)+Number(l.tax),0));
      operation('payment',{order_id:order,method:['upi','cash','card','upi','bank','cash','upi'][i%7],amount:total},payment_,result=>find_(data,'payments','payment_id',result.id).payment_date=timestamp);
      if (i%5===0) {
        operation('ship',{order_id:order,carrier:'SYN50 Local Delivery',carrier_reference:'SYN50-DELIVERY-'+(i+1),status:'dispatched'},ship_,result=>find_(data,'shipments','shipment_id',result.id).dispatched_at=at(day,18));
        operation('ship',{order_id:order,status:'delivered'},ship_,result=>find_(data,'shipments','shipment_id',result.id).delivered_at=at(day+1,12));
      }
      if (i%10===4) {
        const restock=i%20===4;
        const ret=operation('returnOrder',{order_id:order,reason:['SYN50 unwanted item','SYN50 damaged package'][restock?0:1],items:[{order_line_no:1,returned_qty:1,condition:restock?'saleable':'damaged',restock:restock}]},returnOrder_,result=>{
          find_(data,'returns','return_id',result.id).return_date=at(day+1,14);
          data.inventory_movements.filter(m=>m.reference_id===result.id).forEach(m=>m.occurred_at=at(day+1,14));
        });
        const line=lines[0], amount=money_(Number(line.unit_price)-Number(line.discount)/Number(line.quantity));
        operation('refund',{return_id:ret,amount:amount},refund_);
      }
    }
    validateSnapshot_(data);
    const report=verifySupermarket50_(data);
    data.audit_logs.push(stamp_({audit_id:marker,actor_id:actor.user_id,entity_table:'synthetic_supermarket_50',entity_id:'SYN50',action:'post',before_data:'',after_data:JSON.stringify(report)}));
    commit_(data);
    console.log(JSON.stringify(report,null,2)); return report;
  } finally { lock.releaseLock(); }
}

function verifySupermarket50_(data) {
  const products=data.products.filter(p=>/^SYN50-\d{3}$/.test(p.sku)), productIds=products.map(p=>p.product_id);
  const lines=data.sales_order_items.filter(l=>productIds.includes(l.product_id));
  const orderIds=Array.from(new Set(lines.map(l=>l.order_id)));
  const balances=data.inventory_balances.filter(b=>productIds.includes(b.product_id));
  const returns=data.returns.filter(r=>orderIds.includes(r.order_id));
  let net=0,cogs=0;
  if (products.length!==30 || orderIds.length!==50) throw new Error('Expected 30 SYN50 products and 50 linked sales');
  balances.forEach(b=>{
    const ledger=data.inventory_movements.filter(m=>m.store_id===b.store_id && m.product_id===b.product_id).reduce((s,m)=>s+Number(m.quantity_change),0);
    if (ledger!==Number(b.quantity_on_hand) || Number(b.quantity_on_hand)<0) throw new Error('SYN50 stock reconciliation failed');
  });
  orderIds.forEach(id=>{
    const orderLines=lines.filter(l=>l.order_id===id);
    const total=money_(orderLines.reduce((s,l)=>s+Number(l.quantity)*Number(l.unit_price)-Number(l.discount)+Number(l.tax),0));
    const paid=money_(data.payments.filter(p=>p.order_id===id && p.status==='settled').reduce((s,p)=>s+Number(p.amount),0));
    if (total!==paid) throw new Error('SYN50 payment reconciliation failed');
    orderLines.forEach(l=>{
      const returned=data.return_items.filter(i=>Number(i.order_line_no)===Number(l.line_no) && returns.some(r=>r.return_id===i.return_id && r.order_id===id && r.status==='accepted')).reduce((s,i)=>s+Number(i.returned_qty),0);
      if (returned>Number(l.quantity)) throw new Error('SYN50 over-return');
      net+=(Number(l.quantity)-returned)*(Number(l.unit_price)-Number(l.discount)/Number(l.quantity));
      cogs+=(Number(l.quantity)-returned)*Number(l.cost_snapshot);
    });
  });
  return {status:'passed',dataset:'SYN50',synthetic:true,additional_sales:orderIds.length,line_items:lines.length,products:products.length,customers:data.customers.filter(c=>String(c.full_name).startsWith('SYN50 ')).length,stores:data.stores.filter(s=>String(s.store_name).startsWith('SYN50 ')).length,purchase_orders:data.purchase_orders.filter(p=>data.stores.some(s=>s.store_id===p.store_id && String(s.store_name).startsWith('SYN50 '))).length,returns:returns.length,net_sales:money_(net),gross_profit:money_(net-cogs),checks:['50 linked sales','30 supermarket products across 10 categories','Payments reconciled','Nonnegative stock and reconciled ledgers','Accepted returns bounded by sold units'],note:'Controlled, varied synthetic coverage, not a statistically representative or bias-free real-world sample. Prices exclude tax; no actual GST treatment is implied. Existing data is retained.'};
}
