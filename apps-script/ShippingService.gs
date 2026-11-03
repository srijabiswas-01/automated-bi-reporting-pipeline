function ship_(data,p) {
  const order=find_(data,'sales_orders','order_id',p.order_id);
  if (order.order_status!=='completed') throw new Error('Completed order required');
  let row=data.shipments.find(s=>s.order_id===p.order_id);
  if (row && row.status==='delivered') throw new Error('Shipment already delivered');
  if (!['dispatched','delivered'].includes(p.status)) throw new Error('Invalid shipment status');
  if (p.status==='delivered' && (!row || row.status!=='dispatched')) throw new Error('Dispatch before delivery');
  const fields={carrier:p.carrier || (row && row.carrier) || '',carrier_reference:p.carrier_reference || (row && row.carrier_reference) || '',status:p.status};
  if (p.status==='dispatched') fields.dispatched_at=now_(); else fields.delivered_at=now_();
  if (row) update_(row,fields); else { row=stamp_(Object.assign({shipment_id:uuid_(),order_id:p.order_id,delivered_at:''},fields)); data.shipments.push(row); }
  return {id:row.shipment_id};
}
