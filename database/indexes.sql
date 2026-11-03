BEGIN;
CREATE INDEX sales_orders_date_store ON sales_orders(order_date, store_id);
CREATE INDEX sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX sales_items_product ON sales_order_items(product_id);
CREATE INDEX movements_product_store_time ON inventory_movements(product_id, store_id, occurred_at);
CREATE INDEX price_history_product_time ON product_price_history(product_id, effective_at);
CREATE INDEX runs_period_time ON pipeline_runs(period_key, started_at DESC);
-- Session-level advisory locks must coordinate workers; this is a second guard.
CREATE UNIQUE INDEX one_running_period ON pipeline_runs(period_key) WHERE status = 'running';
CREATE INDEX quality_errors_run ON quality_errors(run_id);
COMMIT;
