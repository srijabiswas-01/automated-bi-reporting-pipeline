/**
 * Run loadAndTestDemo from the Apps Script editor as an administrator.
 * Adds labeled synthetic records through api(); does not clear existing data.
 * Stable request IDs make interrupted runs resumable without duplicate transactions.
 */
function loadAndTestDemo() {
  const actor=api('bootstrap',{}).actor;
  if (actor.role!=='administrator') throw new Error('Administrator required to load demonstration data');
  const checks=[];
  function request(number) { return 'd3a00000-0000-4000-8000-'+String(number).padStart(12,'0'); }
  function call(number, action, payload) {
    return api(action,Object.assign({},payload,{request_id:request(number)})).result.id;
  }
  function assert(ok,message) {
    if (!ok) throw new Error('Demo verification failed: '+message);
    checks.push(message);
  }
  function reject(number,action,payload,pattern,label) {
    let error=null;
    try { call(number,action,payload); } catch (e) { error=e; }
    assert(error && pattern.test(error.message),label);
  }
  function master(number,table,record) { return call(number,'saveMaster',{table:table,record:record}); }

  const store=master(1,'stores',{store_name:'TEST DEMO Store',city:'Pune',region:'West',status:'active'});
  const brand=master(2,'brands',{brand_name:'TEST DEMO Brand'});
  const segment=master(3,'segments',{segment_name:'TEST DEMO Consumer'});
  const category=master(4,'categories',{category_name:'TEST DEMO Office Supplies',parent_category_id:''});
  const supplier=master(5,'suppliers',{supplier_name:'TEST DEMO Supplier',contact:'Synthetic test contact',email:'supplier@example.invalid',lead_time_days:3,purchasing_terms:'Demo only',status:'active'});
  const customer=master(6,'customers',{customer_type:'individual',full_name:'TEST DEMO Customer',email:'customer@example.invalid',phone:'',segment_id:segment,status:'active'});
  const product=master(7,'products',{sku:'TEST-DEMO-A4-001',product_name:'TEST DEMO A4 Paper',category_id:category,brand_id:brand,gtin:'',unit:'ream',cost_price:200,selling_price:300,tax_code:'DEMO-ZERO',status:'active'});
  const po=call(8,'purchase',{supplier_id:supplier,store_id:store,items:[{product_id:product,quantity:10,unit_cost:200}]});
  const receipt=call(9,'receive',{po_id:po,items:[{po_line_no:1,received_qty:10,accepted_qty:10}]});
  const salePayload={customer_id:customer,store_id:store,channel:'store',items:[{product_id:product,quantity:2,discount:0,tax:0}]};
  const order=call(10,'sale',salePayload);
  const payment=call(11,'payment',{order_id:order,method:'cash',amount:600});
  call(12,'ship',{order_id:order,carrier:'TEST DEMO Pickup',carrier_reference:'TEST-DEMO-001',status:'dispatched'});
  call(13,'ship',{order_id:order,status:'delivered'});

  // Retrying exactly the same operation must return the same reference.
  assert(call(10,'sale',salePayload)===order,'Sale retry returns the original order');
  reject(90,'sale',{customer_id:customer,store_id:store,items:[{product_id:product,quantity:1000}]},/Insufficient/,'Overselling is rejected');
  reject(91,'saveMaster',{table:'products',record:{sku:'TEST-DEMO-A4-001',product_name:'TEST DEMO Duplicate',category_id:category,unit:'ream',cost_price:200,selling_price:300,tax_code:'DEMO-ZERO',status:'active'}},/Duplicate/,'Duplicate SKU is rejected');
  reject(92,'returnOrder',{order_id:order,reason:'TEST DEMO invalid return',items:[{order_line_no:1,returned_qty:3,condition:'saleable',restock:true}]},/exceeds/,'Returning more than sold is rejected');
  reject(93,'payment',{order_id:order,method:'cash',amount:1},/exceeds/,'Payment above the outstanding balance is rejected');

  const snapshot=api('bootstrap',{}).data;
  const line=snapshot.sales_order_items.find(i=>i.order_id===order);
  const balance=snapshot.inventory_balances.find(b=>b.store_id===store && b.product_id===product);
  const movements=snapshot.inventory_movements.filter(m=>m.store_id===store && m.product_id===product);
  const payments=snapshot.payments.filter(p=>p.order_id===order && p.status==='settled');
  const shipment=snapshot.shipments.find(s=>s.order_id===order);
  assert(snapshot.sales_orders.filter(o=>o.order_id===order).length===1,'Only one demo sales order exists');
  assert(Number(line.unit_price)===300 && Number(line.cost_snapshot)===200,'Original price and cost snapshots are preserved');
  assert(Number(balance.quantity_on_hand)===8 && Number(balance.quantity_reserved)===0,'Final demo stock is eight available units');
  assert(movements.reduce((sum,m)=>sum+Number(m.quantity_change),0)===8,'Stock ledger reconciles to the balance');
  assert(payments.length===1 && Number(payments[0].amount)===600,'Exactly one INR 600 payment is settled');
  assert(shipment.status==='delivered','Demo shipment is delivered');
  const net=Number(line.quantity)*Number(line.unit_price)-Number(line.discount);
  const profit=net-Number(line.quantity)*Number(line.cost_snapshot);
  assert(net===600 && profit===200,'Demo net sales are INR 600 and gross profit is INR 200');
  const report={status:'passed',synthetic:true,checks:checks,ids:{store:store,product:product,purchase_order:po,receipt:receipt,sales_order:order,payment:payment},expected:{available_stock:8,net_sales:600,gross_profit:200},scope:'These totals apply to TEST DEMO records; existing store totals may differ.'};
  console.log(JSON.stringify(report,null,2));
  return report;
}
