import mysql, { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";

const pool: Pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306"),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "creencia_coffee",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export async function query<T>(sql: string, params?: unknown[]): Promise<T> {
  const [rows] = await pool.execute(sql, params as any);
  return rows as T;
}

export async function queryMany<T>(sql: string, params?: unknown[]): Promise<T[]> {
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params as any);
  return rows as T[];
}

export async function queryOne<T>(sql: string, params?: unknown[]): Promise<T | null> {
  const [rows] = await pool.execute<RowDataPacket[]>(sql, params as any);
  return (rows[0] as T) || null;
}

export { pool };