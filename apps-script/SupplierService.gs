function supplierPerformance_(data, id) {
  const orders=data.purchase_orders.filter(p=>p.supplier_id===id);
  return {orders:orders.length,received:orders.filter(p=>p.status==='received').length};
}
