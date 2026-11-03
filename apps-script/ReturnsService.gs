function returnOrder_(data,p) {
  const order=find_(data,'sales_orders','order_id',p.order_id);
  if (order.order_status!=='completed' || !String(p.reason || '').trim()) throw new Error('Completed order and reason required');
  const id=uuid_(); data.returns.push(stamp_({return_id:id,order_id:p.order_id,return_date:now_(),reason:p.reason,status:'accepted'}));
  lines_(p).forEach((i,n)=> {
    const line=data.sales_order_items.find(l=>l.order_id===p.order_id && Number(l.line_no)===Number(i.order_line_no));
    if (!line) throw new Error('Unknown sales line');
    const qty=number_(i.returned_qty,'returned quantity',1,true);
    const prior=data.return_items.filter(x=>Number(x.order_line_no)===Number(line.line_no) && data.returns.some(r=>r.return_id===x.return_id && r.order_id===p.order_id && r.status==='accepted')).reduce((s,x)=>s+Number(x.returned_qty),0);
    if (prior+qty>Number(line.quantity)) throw new Error('Return exceeds sold quantity');
    const restock=i.restock===true && i.condition==='saleable';
    data.return_items.push(stamp_({return_id:id,line_no:n+1,order_line_no:Number(line.line_no),returned_qty:qty,condition:i.condition,restock:restock}));
    if (restock) move_(data,order.store_id,line.product_id,qty,'return',id);
  }); return {id:id};
}
function refund_(data,p) {
  const ret=find_(data,'returns','return_id',p.return_id);
  if (ret.status!=='accepted') throw new Error('Return is not accepted');
  const limit=data.return_items.filter(i=>i.return_id===ret.return_id).reduce((sum,i)=> {
    const line=data.sales_order_items.find(l=>l.order_id===ret.order_id && Number(l.line_no)===Number(i.order_line_no));
    return sum+Number(i.returned_qty)*(Number(line.unit_price)+(Number(line.tax)-Number(line.discount))/Number(line.quantity));
  },0);
  const paid=data.payments.filter(i=>i.order_id===ret.order_id && i.status==='settled').reduce((s,i)=>s+Number(i.amount),0);
  const related=data.returns.filter(r=>r.order_id===ret.order_id).map(r=>r.return_id);
  const refunded=data.refunds.filter(r=>related.includes(r.return_id) && r.refund_status==='settled').reduce((s,r)=>s+Number(r.amount),0);
  const own=data.refunds.filter(r=>r.return_id===ret.return_id && r.refund_status==='settled').reduce((s,r)=>s+Number(r.amount),0);
  const amount=money_(number_(p.amount,'amount',0.01,false));
  if (money_(own+amount)>money_(limit) || money_(refunded+amount)>money_(paid)) throw new Error('Refund exceeds returned value or settled payments');
  const id=uuid_(); data.refunds.push(stamp_({refund_id:id,return_id:ret.return_id,amount:amount,refund_status:'settled'})); return {id:id};
}
