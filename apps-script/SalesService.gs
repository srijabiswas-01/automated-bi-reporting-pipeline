function recordPrice_(data,row) {
  data.product_price_history.push(stamp_({price_id:uuid_(),product_id:row.product_id,cost_price:row.cost_price,selling_price:row.selling_price,effective_at:now_()}));
}
// Counter-sale workflow: creates and fulfils the order atomically; payment stays independent.
function sale_(data,p) {
  if (!active_(find_(data,'customers','customer_id',p.customer_id))) throw new Error('Customer inactive');
  const id=uuid_();
  data.sales_orders.push(stamp_({order_id:id,order_date:now_(),customer_id:p.customer_id,store_id:p.store_id,channel:p.channel || 'store',order_status:'completed',fulfilment_status:'fulfilled'}));
  lines_(p).forEach((i,n)=> {
    const product=find_(data,'products','product_id',i.product_id);
    if (!active_(product)) throw new Error('Product inactive');
    const qty=number_(i.quantity,'quantity',1,true), discount=number_(i.discount || 0,'discount',0,false), tax=number_(i.tax || 0,'tax',0,false);
    if (discount>qty*Number(product.selling_price)) throw new Error('Discount exceeds line value');
    move_(data,p.store_id,i.product_id,-qty,'sale',id);
    data.sales_order_items.push(stamp_({order_id:id,line_no:n+1,product_id:i.product_id,quantity:qty,unit_price:Number(product.selling_price),discount:money_(discount),tax:money_(tax),cost_snapshot:Number(product.cost_price)}));
  });
  return {id:id};
}
function payment_(data,p) {
  const order=find_(data,'sales_orders','order_id',p.order_id);
  if (order.order_status!=='completed') throw new Error('Order is not completed');
  const total=data.sales_order_items.filter(i=>i.order_id===p.order_id).reduce((s,i)=>s+Number(i.quantity)*Number(i.unit_price)-Number(i.discount)+Number(i.tax),0);
  const paid=data.payments.filter(i=>i.order_id===p.order_id && i.status==='settled').reduce((s,i)=>s+Number(i.amount),0);
  const amount=money_(number_(p.amount,'amount',0.01,false));
  if (money_(paid+amount)>money_(total)) throw new Error('Payment exceeds outstanding amount');
  const id=uuid_(); data.payments.push(stamp_({payment_id:id,order_id:p.order_id,method:p.method,amount:amount,status:'settled',payment_date:now_()})); return {id:id};
}
