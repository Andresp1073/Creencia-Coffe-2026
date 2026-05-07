import mysql, { Pool, RowDataPacket } from "mysql2/promise";

function parseDatabaseUrl(url: string) {
  const match = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);

  if (!match) {
    return null;
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
const config = databaseUrl ? parseDatabaseUrl(databaseUrl) : null;

let pool: Pool | null = null;

if (config) {
  pool = mysql.createPool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    charset: "utf8mb4",

    ssl: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    },

    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

function getPool(): Pool {
  if (!pool) {
    throw new Error("Database not configured. Set DATABASE_URL environment variable.");
  }
  return pool;
}

export async function query<T>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  const [rows] = await getPool().execute(sql, params as any);
  return rows as T;
}

export async function queryMany<T>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    sql,
    params as any
  );

  return rows as T[];
}

export async function queryOne<T>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    sql,
    params as any
  );

  return (rows[0] as T) || null;
}

export { pool };