-- Cross-row constraints must inspect all affected rows at commit.
BEGIN;
CREATE FUNCTION validate_retail_relationships() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM goods_receipt_items gi
    JOIN goods_receipts g USING (receipt_id)
    LEFT JOIN purchase_order_items pi ON pi.po_id = g.po_id AND pi.line_no = gi.po_line_no
    WHERE pi.po_id IS NULL
  ) THEN RAISE EXCEPTION 'Receipt line must reference a line on its purchase order'; END IF;
  IF EXISTS (
    SELECT 1 FROM goods_receipt_items gi JOIN goods_receipts g USING (receipt_id)
    JOIN purchase_order_items pi ON pi.po_id = g.po_id AND pi.line_no = gi.po_line_no
    WHERE g.status = 'posted' AND g.is_active AND gi.is_active
    GROUP BY pi.po_id, pi.line_no, pi.ordered_qty
    HAVING SUM(gi.received_qty) > pi.ordered_qty
  ) THEN RAISE EXCEPTION 'Received quantity exceeds ordered quantity'; END IF;
  IF EXISTS (
    SELECT 1 FROM return_items ri JOIN returns r USING (return_id)
    LEFT JOIN sales_order_items si ON si.order_id = r.order_id AND si.line_no = ri.order_line_no
    WHERE si.order_id IS NULL
  ) THEN RAISE EXCEPTION 'Return line must reference a line on its sales order'; END IF;
  IF EXISTS (
    SELECT 1 FROM return_items ri JOIN returns r USING (return_id)
    JOIN sales_order_items si ON si.order_id = r.order_id AND si.line_no = ri.order_line_no
    JOIN sales_orders o ON o.order_id = r.order_id
    WHERE r.status = 'accepted' AND r.is_active AND ri.is_active
    GROUP BY si.order_id, si.line_no, si.quantity, o.order_status
    HAVING SUM(ri.returned_qty) > si.quantity OR o.order_status <> 'completed'
  ) THEN RAISE EXCEPTION 'Accepted returns require completed sales and cannot exceed sold quantity'; END IF;
  RETURN NULL;
END;
$$;
-- Writers must use SERIALIZABLE transactions and retry SQLSTATE 40001;
-- otherwise concurrent cross-row changes can evade aggregate validation.
CREATE CONSTRAINT TRIGGER check_receipt_items AFTER INSERT OR UPDATE OR DELETE ON goods_receipt_items
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_retail_relationships();
CREATE CONSTRAINT TRIGGER check_receipts AFTER INSERT OR UPDATE OR DELETE ON goods_receipts
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_retail_relationships();
CREATE CONSTRAINT TRIGGER check_purchase_items AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_retail_relationships();
CREATE CONSTRAINT TRIGGER check_return_items AFTER INSERT OR UPDATE OR DELETE ON return_items
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_retail_relationships();
CREATE CONSTRAINT TRIGGER check_returns AFTER INSERT OR UPDATE OR DELETE ON returns
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_retail_relationships();
CREATE CONSTRAINT TRIGGER check_sales_items AFTER INSERT OR UPDATE OR DELETE ON sales_order_items
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_retail_relationships();
CREATE CONSTRAINT TRIGGER check_sales_orders AFTER INSERT OR UPDATE OR DELETE ON sales_orders
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION validate_retail_relationships();
COMMIT;
