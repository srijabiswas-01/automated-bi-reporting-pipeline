function dashboard_(data) {
  let sales=0,profit=0;
  const orders=data.sales_orders.filter(o=>o.order_status==='completed');
  data.sales_order_items.filter(i=>orders.some(o=>o.order_id===i.order_id)).forEach(i=> {
    const returned=data.return_items.filter(x=>Number(x.order_line_no)===Number(i.line_no) && data.returns.some(r=>r.return_id===x.return_id && r.order_id===i.order_id && r.status==='accepted')).reduce((s,x)=>s+Number(x.returned_qty),0);
    const qty=Number(i.quantity)-returned, net=qty*(Number(i.unit_price)-Number(i.discount)/Number(i.quantity));
    sales+=net; profit+=net-qty*Number(i.cost_snapshot);
  });
  return {net_sales:money_(sales),gross_profit:money_(profit),orders:orders.length,active_products:data.products.filter(active_).length,low_stock:data.inventory_balances.filter(b=>Number(b.quantity_on_hand)-Number(b.quantity_reserved)<=Number(b.reorder_point)).length};
}
function bootstrap_(data,actor) {
  const visible={};
  Object.keys(data).forEach(table=> {
    if (['users','audit_logs'].includes(table) && actor.role!=='administrator') return;
    visible[table]=data[table];
  });
  return {actor:actor,data:visible,model:MODEL,kpis:dashboard_(data),refreshed_at:now_()};
}
