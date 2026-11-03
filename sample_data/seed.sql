-- Synthetic demonstration only. Run on an empty initialized database.
BEGIN;
SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;
INSERT INTO categories(category_id,category_name) VALUES ('CAT-001','Office Supplies');
INSERT INTO brands(brand_id,brand_name) VALUES ('BR-001','Demo Paper Co');
INSERT INTO segments(segment_id,segment_name) VALUES ('SEG-001','Consumer');
INSERT INTO roles(role_id,role_name) VALUES ('ROLE-001','administrator');
INSERT INTO users(user_id,email,role_id,account_status) VALUES ('USR-001','admin@example.invalid','ROLE-001','active');
INSERT INTO stores(store_id,store_name,city,region,status) VALUES ('STR-001','Demo Central','Pune','West','active');
INSERT INTO suppliers(supplier_id,supplier_name,lead_time_days,status) VALUES ('SUP-001','Synthetic Wholesale',3,'active');
INSERT INTO products(product_id,sku,product_name,category_id,brand_id,unit,cost_price,selling_price,tax_code,status)
VALUES ('PRD-001','PAPER-A4','A4 Paper Ream','CAT-001','BR-001','ream',200,300,'GST18','active');
INSERT INTO product_price_history(price_id,product_id,cost_price,selling_price,effective_at)
VALUES ('PRICE-001','PRD-001',200,300,'2026-11-01T00:00:00Z');
INSERT INTO product_suppliers(product_id,supplier_id,supplier_sku,supplier_cost) VALUES ('PRD-001','SUP-001','A4-500',200);
INSERT INTO customers(customer_id,customer_type,full_name,email,segment_id,status)
VALUES ('CUS-001','individual','Demo Customer','customer@example.invalid','SEG-001','active');
INSERT INTO customer_addresses(address_id,customer_id,city,state,postal_code,country,address_type)
VALUES ('ADDR-001','CUS-001','Pune','Maharashtra','411001','IN','shipping');
INSERT INTO purchase_orders(po_id,supplier_id,store_id,order_date,expected_date,status)
VALUES ('PO-001','SUP-001','STR-001','2026-11-01','2026-11-02','received');
INSERT INTO purchase_order_items(po_id,line_no,product_id,ordered_qty,unit_cost) VALUES ('PO-001',1,'PRD-001',10,200);
INSERT INTO goods_receipts(receipt_id,po_id,received_date,status) VALUES ('GR-001','PO-001','2026-11-02T08:00:00Z','posted');
INSERT INTO goods_receipt_items(receipt_id,line_no,po_line_no,received_qty,accepted_qty) VALUES ('GR-001',1,1,10,10);
INSERT INTO sales_orders(order_id,order_date,customer_id,store_id,channel,order_status,fulfilment_status)
VALUES ('SO-001','2026-11-03T08:00:00Z','CUS-001','STR-001','store','completed','fulfilled');
INSERT INTO sales_order_items(order_id,line_no,product_id,quantity,unit_price,discount,tax,cost_snapshot)
VALUES ('SO-001',1,'PRD-001',2,300,60,97.20,200);
INSERT INTO payments(payment_id,order_id,method,amount,status,payment_date)
VALUES ('PAY-001','SO-001','upi',637.20,'settled','2026-11-03T08:00:00Z');
INSERT INTO shipments(shipment_id,order_id,carrier,dispatched_at,delivered_at,status)
VALUES ('SHIP-001','SO-001','Store pickup','2026-11-03T08:00:00Z','2026-11-03T08:00:00Z','delivered');
INSERT INTO returns(return_id,order_id,return_date,reason,status)
VALUES ('RET-001','SO-001','2026-11-03T09:00:00Z','Unneeded item','accepted');
INSERT INTO return_items(return_id,line_no,order_line_no,returned_qty,condition,restock)
VALUES ('RET-001',1,1,1,'saleable',true);
INSERT INTO refunds(refund_id,return_id,amount,refund_status) VALUES ('REF-001','RET-001',318.60,'settled');
INSERT INTO inventory_balances(store_id,product_id,quantity_on_hand,quantity_reserved,reorder_point)
VALUES ('STR-001','PRD-001',9,0,3);
INSERT INTO inventory_movements(movement_id,store_id,product_id,movement_type,quantity_change,reference_id,occurred_at)
VALUES ('MOV-001','STR-001','PRD-001','receipt',10,'GR-001','2026-11-02T08:00:00Z'),
('MOV-002','STR-001','PRD-001','sale',-2,'SO-001','2026-11-03T08:00:00Z'),
('MOV-003','STR-001','PRD-001','return',1,'RET-001','2026-11-03T09:00:00Z');
INSERT INTO audit_logs(audit_id,actor_id,entity_table,entity_id,action,after_data)
VALUES ('AUD-001','USR-001','products','PRD-001','create','{"sku":"PAPER-A4"}');
COMMIT;
