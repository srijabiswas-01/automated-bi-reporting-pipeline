function dashboard_(data) {
  let sales=0,profit=0;
  const live=row=>row.is_active!==false && row.is_active!=='false';
  const orders=data.sales_orders.filter(o=>o.order_status==='completed' && live(o));
  const orderIds=new Set(orders.map(o=>o.order_id));
  const accepted=new Map(data.returns.filter(r=>r.status==='accepted' && live(r)).map(r=>[r.return_id,r.order_id]));
  const returned=new Map(), lineKey=(id,line)=>JSON.stringify([id,Number(line)]);
  data.return_items.filter(live).forEach(row=>{
    if (!accepted.has(row.return_id)) return;
    const k=lineKey(accepted.get(row.return_id),row.order_line_no);
    returned.set(k,(returned.get(k)||0)+Number(row.returned_qty));
  });
  data.sales_order_items.filter(i=>orderIds.has(i.order_id) && live(i)).forEach(i=> {
    const qty=Number(i.quantity)-(returned.get(lineKey(i.order_id,i.line_no))||0);
    const net=qty*(Number(i.unit_price)-Number(i.discount)/Number(i.quantity));
    sales+=net; profit+=net-qty*Number(i.cost_snapshot);
  });
  return {net_sales:money_(sales),gross_profit:money_(profit),orders:orders.length,active_products:data.products.filter(active_).length,low_stock:data.inventory_balances.filter(b=>live(b) && Number(b.quantity_on_hand)-Number(b.quantity_reserved)<=Number(b.reorder_point)).length};
}
function bootstrap_(data,actor) {
  const visible={};
  Object.keys(data).forEach(table=> {
    if (['users','audit_logs'].includes(table) && actor.role!=='administrator') return;
    visible[table]=data[table];
  });
  return {actor:actor,data:visible,model:MODEL,display_codes:DISPLAY_CODES,kpis:dashboard_(data),refreshed_at:now_()};
}
