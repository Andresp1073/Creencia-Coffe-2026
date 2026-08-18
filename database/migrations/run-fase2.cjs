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

  // ---------- BACKUP ----------
  const backupDir = path.join(__dirname, "..", "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `backup-pre-fase4b-${stamp}.json`);
  const backup = { productos: [], orders: [], customers: [], invoices: [] };
  const [prods] = await conn.query("SELECT * FROM products");
  backup.productos = prods;
  const [ords] = await conn.query("SELECT * FROM orders");
  backup.orders = ords;
  const [custs] = await conn.query("SELECT * FROM customers");
  backup.customers = custs;
  const [invs] = await conn.query("SELECT * FROM invoices");
  backup.invoices = invs;
  fs.writeFileSync(backupFile, JSON.stringify(backup, null, 2));
  log(`BACKUP -> ${backupFile} (${prods.length} productos, ${ords.length} ordenes, ${custs.length} clientes, ${invs.length} facturas)`);

  // ---------- HELPERS ----------
  const cols = async (t) => {
    const [r] = await conn.query(
      "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME=?", [db, t]);
    return new Set(r.map(x => x.COLUMN_NAME));
  };
  const exec = async (label, sql) => {
    try { await conn.query(sql); log(`OK  ${label}`); }
    catch (e) { log(`ERR ${label}: ${e.message}`); }
  };

  // ---------- 1. orders.payment_due_date ----------
  const ocols = await cols("orders");
  if (ocols.has("payment_due_date")) {
    log("SKIP orders.payment_due_date (existe)");
  } else {
    await exec("orders ADD payment_due_date", "ALTER TABLE orders ADD COLUMN payment_due_date DATE DEFAULT NULL");
  }

  await conn.end();
  log("MIGRACION FASE 4B FINALIZADA");
}

main().catch((e) => { console.error("FATAL", e.message); process.exit(1); });