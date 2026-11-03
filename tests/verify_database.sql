-- Run after seed.sql using psql -v ON_ERROR_STOP=1.
DO $$
BEGIN
  IF (SELECT net_sales FROM reporting_daily_sales) <> 270 THEN
    RAISE EXCEPTION 'Expected net sales 270';
  END IF;
  IF (SELECT gross_profit FROM reporting_daily_sales) <> 70 THEN
    RAISE EXCEPTION 'Expected gross profit 70';
  END IF;
  IF (SELECT available_quantity FROM reporting_inventory) <> 9 THEN
    RAISE EXCEPTION 'Expected available stock 9';
  END IF;
  IF EXISTS (SELECT 1 FROM reporting_stock_reconciliation WHERE difference <> 0) THEN
    RAISE EXCEPTION 'Inventory ledger does not reconcile';
  END IF;
  BEGIN
    INSERT INTO products(product_id,sku,product_name,category_id,unit,cost_price,selling_price,tax_code,status)
    VALUES ('BAD','PAPER-A4','Duplicate','CAT-001','ream',1,1,'GST18','active');
    RAISE EXCEPTION 'Duplicate SKU was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
  BEGIN
    UPDATE inventory_balances SET quantity_on_hand = -1;
    RAISE EXCEPTION 'Negative stock was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;
