import mysql, { Pool, RowDataPacket, ResultSetHeader } from "mysql2/promise";

function parseDatabaseUrl(url: string) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(\w+)/);
  if (!match) {
    throw new Error("Invalid DATABASE_URL format");
  }
  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: parseInt(match[4]),
    database: match[5],
  };
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not defined");
}

const config = parseDatabaseUrl(databaseUrl);

const pool: Pool = mysql.createPool({
  host: config.host,
  port: config.port,
  user: config.user,
  password: config.password,
  database: config.database,
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