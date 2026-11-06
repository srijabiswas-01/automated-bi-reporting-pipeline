function purchase_(data,p) {
  const supplier=find_(data,'suppliers','supplier_id',p.supplier_id);
  if (!active_(supplier)) throw new Error('Supplier inactive');
  find_(data,'stores','store_id',p.store_id);
  const date=p.order_date || Utilities.formatDate(new Date(),'Asia/Kolkata','yyyy-MM-dd');
  if (p.expected_date && p.expected_date<date) throw new Error('Expected date precedes order');
  const id=uuid_();
  data.purchase_orders.push(stamp_({po_id:id,supplier_id:p.supplier_id,store_id:p.store_id,order_date:date,expected_date:p.expected_date || '',status:'approved'}));
  lines_(p).forEach((i,n)=> {
    if (!active_(find_(data,'products','product_id',i.product_id))) throw new Error('Inactive product');
    data.purchase_order_items.push(stamp_({po_id:id,line_no:n+1,product_id:i.product_id,ordered_qty:number_(i.quantity,'quantity',1,true),unit_cost:number_(i.unit_cost,'unit cost',0,false)}));
  });
  return {id:id};
}
function receive_(data,p) {
  const po=find_(data,'purchase_orders','po_id',p.po_id);
  if (!['approved','partial'].includes(po.status)) throw new Error('Purchase is not open');
  const id=uuid_();
  data.goods_receipts.push(stamp_({receipt_id:id,po_id:po.po_id,received_date:now_(),status:'posted'}));
  const posted=new Set(data.goods_receipts.filter(g=>g.po_id===po.po_id && g.status==='posted' && g.is_active!==false).map(g=>g.receipt_id));
  const received=new Map();
  data.goods_receipt_items.filter(x=>posted.has(x.receipt_id) && x.is_active!==false).forEach(x=>{
    const k=Number(x.po_line_no); received.set(k,(received.get(k)||0)+Number(x.received_qty));
  });
  lines_(p).forEach((i,n)=> {
    const line=data.purchase_order_items.find(l=>l.po_id===po.po_id && Number(l.line_no)===Number(i.po_line_no));
    if (!line) throw new Error('Unknown purchase line');
    const qty=number_(i.received_qty,'received quantity',1,true), accepted=number_(i.accepted_qty,'accepted quantity',0,true);
    const prior=received.get(Number(line.line_no)) || 0;
    if (accepted>qty || prior+qty>Number(line.ordered_qty)) throw new Error('Receipt exceeds allowed quantities');
    received.set(Number(line.line_no),prior+qty);
    data.goods_receipt_items.push(stamp_({receipt_id:id,line_no:n+1,po_line_no:Number(line.line_no),received_qty:qty,accepted_qty:accepted}));
    if (accepted) move_(data,po.store_id,line.product_id,accepted,'receipt',id);
  });
  const complete=data.purchase_order_items.filter(i=>i.po_id===po.po_id && i.is_active!==false).every(i=>(received.get(Number(i.line_no))||0)===Number(i.ordered_qty));
  update_(po,{status:complete?'received':'partial'}); return {id:id};
}
