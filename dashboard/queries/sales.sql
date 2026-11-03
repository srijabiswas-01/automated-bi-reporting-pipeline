SELECT * FROM reporting_daily_sales
WHERE sales_date BETWEEN :start_date AND :end_date
ORDER BY sales_date, store_id;
