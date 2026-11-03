function customerHistory_(data, id) {
  find_(data,'customers','customer_id',id);
  return data.sales_orders.filter(o=>o.customer_id===id);
}
