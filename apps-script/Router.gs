const PAGES = {
  "Dashboard": {
    "title": "Store overview",
    "description": "Sales, margin and stock signals from your operational records.",
    "table": null,
    "form": null
  },
  "ProductList": {
    "title": "Products",
    "description": "Search your catalogue, review prices and maintain product status.",
    "table": "products",
    "form": "ProductForm"
  },
  "ProductForm": {
    "title": "Product details",
    "description": "Maintain identifiers, classification, prices and tax codes.",
    "table": "products",
    "form": "master"
  },
  "Categories": {
    "title": "Categories",
    "description": "Organize categories and their parent relationships.",
    "table": "categories",
    "form": "master"
  },
  "Customers": {
    "title": "Customers",
    "description": "Customer profiles, segments and contact information.",
    "table": "customers",
    "form": "CustomerForm"
  },
  "CustomerForm": {
    "title": "Customer details",
    "description": "Create or update an individual or business customer.",
    "table": "customers",
    "form": "master"
  },
  "Suppliers": {
    "title": "Suppliers",
    "description": "Manage your supplier network and purchasing terms.",
    "table": "suppliers",
    "form": "SupplierForm"
  },
  "SupplierForm": {
    "title": "Supplier details",
    "description": "Maintain supplier contacts, lead times and account status.",
    "table": "suppliers",
    "form": "master"
  },
  "PurchaseOrders": {
    "title": "Purchase orders",
    "description": "Create approved purchase orders with multiple product lines.",
    "table": "purchase_orders",
    "form": "purchase"
  },
  "GoodsReceipts": {
    "title": "Goods receipts",
    "description": "Receive purchase lines and post accepted quantities to stock.",
    "table": "goods_receipts",
    "form": "receive"
  },
  "Inventory": {
    "title": "Inventory",
    "description": "Available stock, reorder points, adjustments and store transfers.",
    "table": "inventory_balances",
    "form": "adjust"
  },
  "StockMovements": {
    "title": "Stock movements",
    "description": "An auditable ledger of receipts, sales, returns and transfers.",
    "table": "inventory_movements",
    "form": null
  },
  "SalesOrders": {
    "title": "Sales orders & payments",
    "description": "Review completed counter sales and record payments independently.",
    "table": "sales_orders",
    "form": "payment"
  },
  "SalesForm": {
    "title": "New sale",
    "description": "Select products and quantities; historical price and cost snapshots are preserved.",
    "table": "sales_order_items",
    "form": "sale"
  },
  "Returns": {
    "title": "Returns & refunds",
    "description": "Accept original order lines, decide restocking and settle refunds.",
    "table": "returns",
    "form": "returnOrder"
  },
  "Shipping": {
    "title": "Shipping",
    "description": "Dispatch orders and track delivery with carrier references.",
    "table": "shipments",
    "form": "ship"
  },
  "Reports": {
    "title": "Reports",
    "description": "Inspect operational totals and export source records for analysis.",
    "table": null,
    "form": null
  },
  "Users": {
    "title": "Administration",
    "description": "Manage authorized users, roles, stores, brands, segments and addresses.",
    "table": "users",
    "form": "master"
  },
  "AuditLogs": {
    "title": "Audit logs",
    "description": "Review actor, time, entity changes and transaction details.",
    "table": "audit_logs",
    "form": null
  }
};
function include_(name) {
  if (!/^(Partial_|Page_)/.test(name)) throw new Error("Invalid template");
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
