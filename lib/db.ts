import mysql, { Pool, RowDataPacket, PoolConnection } from "mysql2/promise";

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
    charset: "UTF8MB4_UNICODE_CI",
    ssl: {
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
    },
    waitForConnections: true,
    connectionLimit: 3,
    queueLimit: 0,
    connectTimeout: 60000,
    idleTimeout: 60000,
    maxIdle: 3,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });
}

function getPool(): Pool {
  if (!pool) {
    throw new Error("Database not configured. Set DATABASE_URL environment variable.");
  }
  return pool;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 2000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      const isRetryable = 
        error.code === 'ETIMEDOUT' || 
        error.code === 'ECONNRESET' || 
        error.code === 'ECONNREFUSED' ||
        error.code === 'PROTOCOL_CONNECTION_LOST' ||
        error.code === 'HANDSHAKE_SSL_ERROR';
      
      if (isRetryable && i < retries - 1) {
        console.log(`Database retry ${i + 1}/${retries} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5;
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}

export async function query<T>(
  sql: string,
  params?: unknown[]
): Promise<T> {
  return withRetry(async () => {
    const [rows] = await getPool().execute(sql, params as any);
    return rows as T;
  });
}

export async function queryMany<T>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  return withRetry(async () => {
    const [rows] = await getPool().execute<RowDataPacket[]>(sql, params as any);
    return rows as T[];
  });
}

export async function queryOne<T>(
  sql: string,
  params?: unknown[]
): Promise<T | null> {
  return withRetry(async () => {
    const [rows] = await getPool().execute<RowDataPacket[]>(sql, params as any);
    return (rows[0] as T) || null;
  });
}

export { pool };