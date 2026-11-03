SELECT * FROM reporting_inventory
ORDER BY needs_reorder DESC, available_quantity, product_id;
