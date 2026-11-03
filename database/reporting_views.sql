BEGIN;
-- Discounts and tax are line totals. Unit price and cost snapshot are per unit.
-- Accepted merchandise returns reduce revenue independently of refund settlement.
CREATE VIEW reporting_sales_lines AS
WITH accepted AS (
  SELECT r.order_id, ri.order_line_no, SUM(ri.returned_qty) AS returned_qty
  FROM returns r JOIN return_items ri USING (return_id)
  WHERE r.status = 'accepted' AND r.is_active AND ri.is_active
  GROUP BY r.order_id, ri.order_line_no
)
SELECT o.order_id, o.order_date, o.store_id, o.customer_id, o.channel,
       i.line_no, i.product_id, i.quantity,
       COALESCE(a.returned_qty, 0) AS returned_qty,
       i.quantity * i.unit_price AS gross_sales,
       i.discount,
       (i.quantity - COALESCE(a.returned_qty, 0)) *
           (i.unit_price - i.discount / i.quantity) AS net_sales,
       (i.quantity - COALESCE(a.returned_qty, 0)) * i.cost_snapshot AS cogs,
       (i.quantity - COALESCE(a.returned_qty, 0)) *
           (i.unit_price - i.discount / i.quantity - i.cost_snapshot) AS gross_profit
FROM sales_orders o JOIN sales_order_items i USING (order_id)
LEFT JOIN accepted a ON a.order_id = i.order_id AND a.order_line_no = i.line_no
WHERE o.order_status = 'completed' AND o.is_active AND i.is_active;

CREATE VIEW reporting_daily_sales AS
SELECT (order_date AT TIME ZONE 'Asia/Kolkata')::date AS sales_date,
       store_id, COUNT(DISTINCT order_id) AS completed_orders,
       SUM(net_sales) AS net_sales, SUM(cogs) AS cogs,
       SUM(gross_profit) AS gross_profit,
       SUM(net_sales) / NULLIF(COUNT(DISTINCT order_id), 0) AS average_order_value,
       100 * SUM(gross_profit) / NULLIF(SUM(net_sales), 0) AS gross_margin_pct
FROM reporting_sales_lines GROUP BY 1, 2;

CREATE VIEW reporting_inventory AS
SELECT b.store_id, b.product_id, p.sku, p.product_name, b.quantity_on_hand,
       b.quantity_reserved, b.quantity_on_hand - b.quantity_reserved AS available_quantity,
       b.reorder_point,
       b.quantity_on_hand - b.quantity_reserved <= b.reorder_point AS needs_reorder,
       b.quantity_on_hand * p.cost_price AS current_stock_value
FROM inventory_balances b JOIN products p USING (product_id)
WHERE b.is_active;

CREATE VIEW reporting_stock_reconciliation AS
SELECT b.store_id, b.product_id, b.quantity_on_hand,
       COALESCE(SUM(m.quantity_change) FILTER (WHERE m.is_active), 0) AS ledger_quantity,
       b.quantity_on_hand - COALESCE(SUM(m.quantity_change) FILTER (WHERE m.is_active), 0) AS difference
FROM inventory_balances b LEFT JOIN inventory_movements m
ON m.store_id = b.store_id AND m.product_id = b.product_id
GROUP BY b.store_id, b.product_id, b.quantity_on_hand;

CREATE VIEW reporting_customers AS
SELECT c.customer_id, c.full_name, c.segment_id,
       COUNT(DISTINCT s.order_id) AS completed_orders,
       COALESCE(SUM(s.net_sales), 0) AS lifetime_net_sales,
       MAX(s.order_date) AS latest_purchase_at
FROM customers c LEFT JOIN reporting_sales_lines s USING (customer_id)
WHERE c.is_active GROUP BY c.customer_id, c.full_name, c.segment_id;
COMMIT;
