const { createConnection } = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

const url = process.env.DATABASE_URL;
const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);

async function main() {
  const conn = await createConnection({
    host: m[3], port: parseInt(m[4]), user: m[1], password: m[2], database: m[5],
    charset: "UTF8MB4_UNICODE_CI", ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    multipleStatements: false,
  });

  const db = m[5];
  const log = (msg) => console.log(msg);

  // ---------- BACKUP (Fase A) ----------
  const backupDir = path.join(__dirname, "..", "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `backup-pre-fase1-${stamp}.json`);
  const backup = { productos: [], orders: [] };
  const [prods] = await conn.query("SELECT * FROM products");
  backup.productos = prods;
  const [ords] = await conn.query("SELECT * FROM orders");
  backup.orders = ords;
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  log(`BACKUP -> ${backupFile} (${prods.length} productos, ${ords.length} ordenes)`);

  // ---------- HELPERS ----------
  const hasTable = async (t) => {
    const [r] = await conn.query(
      "SELECT COUNT(*) c FROM information_schema.TABLES WHERE TABLE_SCHEMA=? AND TABLE_NAME=?", [db, t]);
    return r[0].c > 0;
  };
  const cols = async (t) => {
    const [r] = await conn.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?", [db, t]);
    return new Set(r.map(x => x.COLUMN_NAME));
  };
  const hasIndex = async (t, idx) => {
    const [r] = await conn.query(
      "SELECT COUNT(*) c FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND INDEX_NAME=?", [db, t, idx]);
    return r[0].c > 0;
  };
  const hasConstraint = async (t, con) => {
    const [r] = await conn.query(
      "SELECT COUNT(*) c FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=? AND TABLE_NAME=? AND CONSTRAINT_NAME=?", [db, t, con]);
    return r[0].c > 0;
  };
  const exec = async (label, sql) => {
    try { await conn.query(sql); log(`OK  ${label}`); }
    catch (e) { log(`ERR ${label}: ${e.message}`); }
  };

  // ---------- 1. customers ----------
  if (!(await hasTable("customers"))) {
    await exec("CREATE customers", `CREATE TABLE customers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      identification_document_code VARCHAR(2) NOT NULL,
      identification VARCHAR(20) NOT NULL,
      dv VARCHAR(2) DEFAULT NULL,
      legal_organization_code VARCHAR(1) NOT NULL,
      tribute_code VARCHAR(2) NOT NULL DEFAULT 'ZZ',
      responsibilities JSON DEFAULT NULL,
      company VARCHAR(200) DEFAULT NULL,
      names VARCHAR(200) DEFAULT NULL,
      trade_name VARCHAR(200) DEFAULT NULL,
      address VARCHAR(255) DEFAULT NULL,
      email VARCHAR(200) DEFAULT NULL,
      phone VARCHAR(50) DEFAULT NULL,
      country_code VARCHAR(2) NOT NULL DEFAULT 'CO',
      municipality_code VARCHAR(10) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_customer_document (identification_document_code, identification),
      KEY idx_customers_email (email)
    )`);
  } else { log("SKIP customers (existe)"); }

  // ---------- 2. invoices ----------
  if (!(await hasTable("invoices"))) {
    await exec("CREATE invoices", `CREATE TABLE invoices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      order_id INT NOT NULL,
      customer_id INT DEFAULT NULL,
      customer_snapshot JSON DEFAULT NULL,
      reference_code VARCHAR(50) NOT NULL,
      status ENUM('pending', 'processing', 'validated', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
      number VARCHAR(50) DEFAULT NULL,
      cufe VARCHAR(255) DEFAULT NULL,
      is_validated TINYINT(1) NOT NULL DEFAULT 0,
      validated_at DATETIME DEFAULT NULL,
      totals JSON DEFAULT NULL,
      links JSON DEFAULT NULL,
      error JSON DEFAULT NULL,
      attempts INT NOT NULL DEFAULT 0,
      last_attempt_at DATETIME DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_invoice_order (order_id),
      UNIQUE KEY uq_invoice_reference (reference_code),
      KEY idx_invoices_status (status),
      KEY idx_invoices_customer (customer_id),
      CONSTRAINT fk_invoices_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
      CONSTRAINT fk_invoices_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    )`);
  } else { log("SKIP invoices (existe)"); }

  // ---------- 3. products ----------
  const pcols = await cols("products");
  const prodAdds = [
    ["code_reference", "VARCHAR(50) DEFAULT NULL"],
    ["unit_measure_code", "VARCHAR(4) NOT NULL DEFAULT '94'"],
    ["standard_code", "VARCHAR(4) NOT NULL DEFAULT '999'"],
    ["tax_code", "VARCHAR(4) DEFAULT NULL"],
    ["tax_rate", "DECIMAL(5, 2) DEFAULT NULL"],
  ];
  for (const [name, def] of prodAdds) {
    if (pcols.has(name)) { log(`SKIP products.${name} (existe)`); continue; }
    await exec(`products ADD ${name}`, `ALTER TABLE products ADD COLUMN ${name} ${def}`);
  }
  if (!(await hasIndex("products", "idx_products_code_reference"))) {
    await exec("INDEX products.code_reference", "CREATE INDEX idx_products_code_reference ON products (code_reference)");
  } else { log("SKIP idx_products_code_reference (existe)"); }

  // ---------- 4. orders ----------
  const ocols = await cols("orders");
  const ordAdds = [
    ["customer_id", "INT DEFAULT NULL"],
    ["payment_form", "VARCHAR(1) DEFAULT NULL"],
    ["payment_method_code", "VARCHAR(4) DEFAULT NULL"],
    ["payment_reference", "VARCHAR(50) DEFAULT NULL"],
    ["subtotal", "DECIMAL(12, 2) DEFAULT NULL"],
    ["tax_total", "DECIMAL(12, 2) DEFAULT NULL"],
    ["discount_total", "DECIMAL(12, 2) NOT NULL DEFAULT 0.00"],
  ];
  for (const [name, def] of ordAdds) {
    if (ocols.has(name)) { log(`SKIP orders.${name} (existe)`); continue; }
    await exec(`orders ADD ${name}`, `ALTER TABLE orders ADD COLUMN ${name} ${def}`);
  }
  if (!(await hasIndex("orders", "idx_orders_customer"))) {
    await exec("INDEX orders.customer_id", "CREATE INDEX idx_orders_customer ON orders (customer_id)");
  } else { log("SKIP idx_orders_customer (existe)"); }
  if (!(await hasConstraint("orders", "fk_orders_customer"))) {
    await exec("FK orders.customer_id", "ALTER TABLE orders ADD CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL");
  } else { log("SKIP fk_orders_customer (existe)"); }

  await conn.end();
  log("MIGRACION FASE 1 FINALIZADA");
}

main().catch((e) => { console.error("FATAL", e.message); process.exit(1); });