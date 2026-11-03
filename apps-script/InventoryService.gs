function balance_(data, store, product) {
  if (!active_(find_(data,'stores','store_id',store))) throw new Error('Store is inactive');
  if (!active_(find_(data,'products','product_id',product))) throw new Error('Product is inactive');
  let row=data.inventory_balances.find(b=>b.store_id===store && b.product_id===product);
  if (!row) { row=stamp_({store_id:store,product_id:product,quantity_on_hand:0,quantity_reserved:0,reorder_point:0}); data.inventory_balances.push(row); }
  return row;
}
function move_(data, store, product, quantity, type, reference) {
  const b=balance_(data,store,product), next=Number(b.quantity_on_hand)+quantity;
  if (next<Number(b.quantity_reserved)) throw new Error('Insufficient available stock');
  update_(b,{quantity_on_hand:next});
  data.inventory_movements.push(stamp_({movement_id:uuid_(),store_id:store,product_id:product,movement_type:type,quantity_change:quantity,reference_id:reference,occurred_at:now_()}));
}
function adjust_(data,p) {
  if (!String(p.reason || '').trim()) throw new Error('Adjustment reason required');
  const quantity=number_(p.quantity,'quantity',-100000000,true);
  if (!quantity) throw new Error('Quantity cannot be zero');
  const id=uuid_(); move_(data,p.store_id,p.product_id,quantity,'adjustment',id+': '+p.reason);
  if (p.reorder_point!==undefined && p.reorder_point!=='') update_(balance_(data,p.store_id,p.product_id),{reorder_point:number_(p.reorder_point,'reorder point',0,true)});
  return {id:id};
}
function transfer_(data,p) {
  if (p.store_id===p.destination_store_id) throw new Error('Select different stores');
  const qty=number_(p.quantity,'quantity',1,true), id=uuid_();
  move_(data,p.store_id,p.product_id,-qty,'transfer_out',id);
  move_(data,p.destination_store_id,p.product_id,qty,'transfer_in',id);
  return {id:id};
}
