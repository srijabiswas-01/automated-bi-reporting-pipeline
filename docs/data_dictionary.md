# Data dictionary

Generated from `database/model.py`. Each operational table is one Google Sheets tab.

IDs are server-generated UUID strings; compound keys are listed below. Dates use ISO 8601; timestamps use UTC. Currency is INR, stored as exact decimals. Blank CSV cells mean NULL, never zero. Metadata is server managed.

## categories

Primary key: `category_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| category_id | text | PRIMARY KEY |
| category_name | text | NOT NULL UNIQUE |
| parent_category_id | text | REFERENCES categories(category_id) |
| category_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## brands

Primary key: `brand_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| brand_id | text | PRIMARY KEY |
| brand_name | text | NOT NULL UNIQUE |
| brand_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## segments

Primary key: `segment_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| segment_id | text | PRIMARY KEY |
| segment_name | text | NOT NULL UNIQUE |
| segment_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## roles

Primary key: `role_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| role_id | text | PRIMARY KEY |
| role_name | text | NOT NULL UNIQUE |
| role_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## stores

Primary key: `store_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| store_id | text | PRIMARY KEY |
| store_name | text | NOT NULL |
| city | text | NOT NULL |
| region | text | NOT NULL |
| status | text | NOT NULL CHECK (status IN ('active','inactive')) |
| store_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## users

Primary key: `user_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| user_id | text | PRIMARY KEY |
| email | text | NOT NULL UNIQUE |
| role_id | text | NOT NULL REFERENCES roles(role_id) |
| account_status | text | NOT NULL CHECK (account_status IN ('active','inactive')) |
| user_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## suppliers

Primary key: `supplier_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| supplier_id | text | PRIMARY KEY |
| supplier_name | text | NOT NULL |
| contact | text | Optional |
| email | text | Optional |
| lead_time_days | integer | NOT NULL CHECK (lead_time_days >= 0) |
| purchasing_terms | text | Optional |
| status | text | NOT NULL CHECK (status IN ('active','inactive')) |
| supplier_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## products

Primary key: `product_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| product_id | text | PRIMARY KEY |
| sku | text | NOT NULL UNIQUE |
| product_name | text | NOT NULL |
| category_id | text | NOT NULL REFERENCES categories(category_id) |
| brand_id | text | REFERENCES brands(brand_id) |
| gtin | text | UNIQUE |
| unit | text | NOT NULL |
| cost_price | numeric(14,2) | NOT NULL CHECK (cost_price >= 0) |
| selling_price | numeric(14,2) | NOT NULL CHECK (selling_price >= 0) |
| tax_code | text | NOT NULL |
| status | text | NOT NULL CHECK (status IN ('active','inactive')) |
| product_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## product_price_history

Primary key: `price_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| price_id | text | PRIMARY KEY |
| product_id | text | NOT NULL REFERENCES products(product_id) |
| cost_price | numeric(14,2) | NOT NULL CHECK (cost_price >= 0) |
| selling_price | numeric(14,2) | NOT NULL CHECK (selling_price >= 0) |
| effective_at | timestamptz | NOT NULL |
| price_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## customers

Primary key: `customer_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| customer_id | text | PRIMARY KEY |
| customer_type | text | NOT NULL CHECK (customer_type IN ('individual','business')) |
| full_name | text | NOT NULL |
| email | text | Optional |
| phone | text | Optional |
| segment_id | text | REFERENCES segments(segment_id) |
| status | text | NOT NULL CHECK (status IN ('active','inactive')) |
| customer_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## customer_addresses

Primary key: `address_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| address_id | text | PRIMARY KEY |
| customer_id | text | NOT NULL REFERENCES customers(customer_id) |
| city | text | NOT NULL |
| state | text | NOT NULL |
| postal_code | text | NOT NULL |
| country | text | NOT NULL |
| address_type | text | NOT NULL CHECK (address_type IN ('billing','shipping')) |
| address_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## product_suppliers

Primary key: `product_id, supplier_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| product_id | text | NOT NULL REFERENCES products(product_id) |
| supplier_id | text | NOT NULL REFERENCES suppliers(supplier_id) |
| supplier_sku | text | NOT NULL |
| supplier_cost | numeric(14,2) | NOT NULL CHECK (supplier_cost >= 0) |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## sales_orders

Primary key: `order_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| order_id | text | PRIMARY KEY |
| order_date | timestamptz | NOT NULL |
| customer_id | text | NOT NULL REFERENCES customers(customer_id) |
| store_id | text | NOT NULL REFERENCES stores(store_id) |
| channel | text | NOT NULL CHECK (channel IN ('store','online')) |
| order_status | text | NOT NULL CHECK (order_status IN ('draft','confirmed','completed','cancelled')) |
| fulfilment_status | text | NOT NULL CHECK (fulfilment_status IN ('unfulfilled','partial','fulfilled')) |
| order_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## sales_order_items

Primary key: `order_id, line_no`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| order_id | text | NOT NULL REFERENCES sales_orders(order_id) |
| line_no | integer | NOT NULL CHECK (line_no > 0) |
| product_id | text | NOT NULL REFERENCES products(product_id) |
| quantity | integer | NOT NULL CHECK (quantity > 0) |
| unit_price | numeric(14,2) | NOT NULL CHECK (unit_price >= 0) |
| discount | numeric(14,2) | NOT NULL CHECK (discount >= 0 AND discount <= quantity * unit_price) |
| tax | numeric(14,2) | NOT NULL CHECK (tax >= 0) |
| cost_snapshot | numeric(14,2) | NOT NULL CHECK (cost_snapshot >= 0) |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## purchase_orders

Primary key: `po_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| po_id | text | PRIMARY KEY |
| supplier_id | text | NOT NULL REFERENCES suppliers(supplier_id) |
| store_id | text | NOT NULL REFERENCES stores(store_id) |
| order_date | date | NOT NULL |
| expected_date | date | CHECK (expected_date >= order_date) |
| status | text | NOT NULL CHECK (status IN ('draft','approved','partial','received','cancelled')) |
| po_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## purchase_order_items

Primary key: `po_id, line_no`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| po_id | text | NOT NULL REFERENCES purchase_orders(po_id) |
| line_no | integer | NOT NULL CHECK (line_no > 0) |
| product_id | text | NOT NULL REFERENCES products(product_id) |
| ordered_qty | integer | NOT NULL CHECK (ordered_qty > 0) |
| unit_cost | numeric(14,2) | NOT NULL CHECK (unit_cost >= 0) |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## goods_receipts

Primary key: `receipt_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| receipt_id | text | PRIMARY KEY |
| po_id | text | NOT NULL REFERENCES purchase_orders(po_id) |
| received_date | timestamptz | NOT NULL |
| status | text | NOT NULL CHECK (status IN ('draft','posted')) |
| receipt_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## goods_receipt_items

Primary key: `receipt_id, line_no`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| receipt_id | text | NOT NULL REFERENCES goods_receipts(receipt_id) |
| line_no | integer | NOT NULL CHECK (line_no > 0) |
| po_line_no | integer | NOT NULL CHECK (po_line_no > 0) |
| received_qty | integer | NOT NULL CHECK (received_qty > 0) |
| accepted_qty | integer | NOT NULL CHECK (accepted_qty >= 0 AND accepted_qty <= received_qty) |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## inventory_balances

Primary key: `store_id, product_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| store_id | text | NOT NULL REFERENCES stores(store_id) |
| product_id | text | NOT NULL REFERENCES products(product_id) |
| quantity_on_hand | integer | NOT NULL CHECK (quantity_on_hand >= 0) |
| quantity_reserved | integer | NOT NULL CHECK (quantity_reserved >= 0 AND quantity_reserved <= quantity_on_hand) |
| reorder_point | integer | NOT NULL CHECK (reorder_point >= 0) |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## inventory_movements

Primary key: `movement_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| movement_id | text | PRIMARY KEY |
| store_id | text | NOT NULL REFERENCES stores(store_id) |
| product_id | text | NOT NULL REFERENCES products(product_id) |
| movement_type | text | NOT NULL CHECK (movement_type IN ('opening','receipt','sale','return','adjustment','transfer_in','transfer_out')) |
| quantity_change | integer | NOT NULL CHECK (quantity_change <> 0) |
| reference_id | text | NOT NULL |
| occurred_at | timestamptz | NOT NULL |
| movement_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## payments

Primary key: `payment_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| payment_id | text | PRIMARY KEY |
| order_id | text | NOT NULL REFERENCES sales_orders(order_id) |
| method | text | NOT NULL CHECK (method IN ('cash','card','upi','bank')) |
| amount | numeric(14,2) | NOT NULL CHECK (amount > 0) |
| status | text | NOT NULL CHECK (status IN ('pending','settled','failed')) |
| payment_date | timestamptz | NOT NULL |
| payment_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## shipments

Primary key: `shipment_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| shipment_id | text | PRIMARY KEY |
| order_id | text | NOT NULL REFERENCES sales_orders(order_id) |
| carrier | text | Optional |
| carrier_reference | text | Optional |
| dispatched_at | timestamptz | Optional |
| delivered_at | timestamptz | CHECK (delivered_at >= dispatched_at) |
| status | text | NOT NULL CHECK (status IN ('pending','dispatched','delivered','cancelled')) |
| shipment_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## returns

Primary key: `return_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| return_id | text | PRIMARY KEY |
| order_id | text | NOT NULL REFERENCES sales_orders(order_id) |
| return_date | timestamptz | NOT NULL |
| reason | text | NOT NULL |
| status | text | NOT NULL CHECK (status IN ('requested','accepted','rejected')) |
| return_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## return_items

Primary key: `return_id, line_no`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| return_id | text | NOT NULL REFERENCES returns(return_id) |
| line_no | integer | NOT NULL CHECK (line_no > 0) |
| order_line_no | integer | NOT NULL CHECK (order_line_no > 0) |
| returned_qty | integer | NOT NULL CHECK (returned_qty > 0) |
| condition | text | NOT NULL CHECK (condition IN ('saleable','damaged')) |
| restock | boolean | NOT NULL |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## refunds

Primary key: `refund_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| refund_id | text | PRIMARY KEY |
| return_id | text | NOT NULL REFERENCES returns(return_id) |
| amount | numeric(14,2) | NOT NULL CHECK (amount > 0) |
| refund_status | text | NOT NULL CHECK (refund_status IN ('pending','settled','failed')) |
| refund_code | text | UNIQUE |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## audit_logs

Primary key: `audit_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| audit_id | text | PRIMARY KEY |
| actor_id | text | NOT NULL REFERENCES users(user_id) |
| entity_table | text | NOT NULL |
| entity_id | text | NOT NULL |
| action | text | NOT NULL CHECK (action IN ('create','update','deactivate','post')) |
| before_data | jsonb | Optional |
| after_data | jsonb | Optional |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## pipeline_runs

Primary key: `run_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| run_id | text | PRIMARY KEY |
| period_key | text | NOT NULL |
| orchestrator | text | NOT NULL CHECK (orchestrator IN ('github','manual')) |
| status | text | NOT NULL CHECK (status IN ('running','succeeded','failed')) |
| started_at | timestamptz | NOT NULL |
| heartbeat_at | timestamptz | NOT NULL |
| finished_at | timestamptz | Optional |
| rows_extracted | integer | NOT NULL DEFAULT 0 CHECK (rows_extracted >= 0) |
| rows_loaded | integer | NOT NULL DEFAULT 0 CHECK (rows_loaded >= 0) |
| error_message | text | Optional |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## quality_errors

Primary key: `error_id`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| error_id | text | PRIMARY KEY |
| run_id | text | NOT NULL REFERENCES pipeline_runs(run_id) |
| source_table | text | NOT NULL |
| source_key | text | NOT NULL |
| rule | text | NOT NULL |
| message | text | NOT NULL |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |

## etl_watermarks

Primary key: `source_table`.

| Column | PostgreSQL type | Rules |
| --- | --- | --- |
| source_table | text | PRIMARY KEY |
| last_updated_at | timestamptz | NOT NULL |
| last_source_key | text | NOT NULL |
| created_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| updated_at | timestamptz | NOT NULL DEFAULT CURRENT_TIMESTAMP |
| version | integer | NOT NULL DEFAULT 1 CHECK (version > 0) |
| is_active | boolean | NOT NULL DEFAULT true |
