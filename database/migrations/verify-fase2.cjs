const { createConnection } = require("mysql2/promise");
const url = process.env.DATABASE_URL;
const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
(async () => {
  const conn = await createConnection({
    host: m[3], port: parseInt(m[4]), user: m[1], password: m[2], database: m[5],
    charset: "UTF8MB4_UNICODE_CI", ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
  const db = m[5];
  const [col] = await conn.query(
    "SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=? AND TABLE_NAME='orders' AND COLUMN_NAME='payment_due_date'", [db]);
  console.log("ORDERS.payment_due_date:", JSON.stringify(col));
  const [o] = await conn.query(
    "SELECT id, customer_name, total, status, payment_form, payment_due_date FROM orders ORDER BY id LIMIT 30");
  console.log("ORDENES:", JSON.stringify(o));
  await conn.end();
})().catch(e => { console.error("ERR", e.message); process.exit(1); });