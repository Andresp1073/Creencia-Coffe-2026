const { createConnection } = require("mysql2/promise");
const url = process.env.DATABASE_URL;
const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
(async () => {
  const conn = await createConnection({
    host: m[3], port: parseInt(m[4]), user: m[1], password: m[2], database: m[5],
    charset: "UTF8MB4_UNICODE_CI", ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
  const db = m[5];
  const [tables] = await conn.query("SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=? ORDER BY TABLE_NAME", [db]);
  console.log("TABLAS:", JSON.stringify(tables.map(t => t.TABLE_NAME)));
  for (const t of ["customers", "invoices"]) {
    const [cols] = await conn.query("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION", [db, t]);
    console.log(`--- ${t}:`, JSON.stringify(cols));
  }
  const [pcols] = await conn.query("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='products' AND COLUMN_NAME IN ('code_reference','unit_measure_code','standard_code','tax_code','tax_rate')", [db]);
  console.log("PRODUCTS NUEVOS:", JSON.stringify(pcols));
  const [ocols] = await conn.query("SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='orders' AND COLUMN_NAME IN ('customer_id','payment_form','payment_method_code','payment_reference','subtotal','tax_total','discount_total')", [db]);
  console.log("ORDERS NUEVOS:", JSON.stringify(ocols));
  const [idx] = await conn.query("SELECT INDEX_NAME, NON_UNIQUE, GROUP_CONCAT(COLUMN_NAME) cols FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND INDEX_NAME IN ('uq_invoice_order','uq_invoice_reference','uq_customer_document','idx_products_code_reference','idx_orders_customer') GROUP BY INDEX_NAME, NON_UNIQUE", [db]);
  console.log("INDICES:", JSON.stringify(idx));
  const [fk] = await conn.query("SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME, DELETE_RULE FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=? AND REFERENCED_TABLE_NAME IS NOT NULL ORDER BY TABLE_NAME", [db]);
  console.log("FKS:", JSON.stringify(fk));
  const [p] = await conn.query("SELECT id, name, price, stock, presentation, tax_rate FROM products ORDER BY id");
  console.log("PRODUCTOS:", JSON.stringify(p));
  const [o] = await conn.query("SELECT id, customer_name, total, status, customer_id, payment_form, payment_method_code, payment_reference, subtotal, tax_total, discount_total FROM orders ORDER BY id LIMIT 30");
  console.log("ORDENES:", JSON.stringify(o));
  await conn.end();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });