/**
 * Cliente HTTP centralizado de Factus.
 *
 * Se encarga EXCLUSIVAMENTE de la comunicación con Factus (OAuth + API).
 *
 * - Lee la configuración desde process.env (nunca NEXT_PUBLIC_*).
 * - El access_token vive ÚNICAMENTE en memoria (sin BD, cookies ni logs).
 * - 401 => invalida el token cacheado, obtiene uno nuevo y reintenta UNA vez.
 *
 * El cliente NO conoce la estructura de la BD.
 */

import {
  FactusConfigError,
  FactusClientUnavailableError,
  FactusAuthError,
  FactusValidationError,
} from "./errors";
import { FactusInvoicePayload, FactusInvoiceResponse, FactusNumberingRange, FactusTokenResponse } from "./types";

interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number; // epoch ms
}

const TOKEN_FRESH_BUFFER_MS = 60_000;

let tokenCache: TokenCacheEntry | null = null;

function readEnvConfig() {
  const baseUrl = process.env.FACTUS_BASE_URL?.trim().replace(/\/+$/, "");
  const clientId = process.env.FACTUS_CLIENT_ID?.trim();
  const clientSecret = process.env.FACTUS_CLIENT_SECRET;
  const username = process.env.FACTUS_USERNAME?.trim();
  const password = process.env.FACTUS_PASSWORD;

  if (!baseUrl || !clientId || !clientSecret || !username || !password) {
    throw new FactusConfigError(
      "FACTUS_BASE_URL, FACTUS_CLIENT_ID, FACTUS_CLIENT_SECRET, FACTUS_USERNAME y FACTUS_PASSWORD deben estar configurados en el servidor"
    );
  }

  return { baseUrl, clientId, clientSecret, username, password };
}

function isTokenValid(): boolean {
  return tokenCache !== null && tokenCache.expiresAt - Date.now() > TOKEN_FRESH_BUFFER_MS;
}

export function invalidateTokenCache(): void {
  tokenCache = null;
}

/**
 * OAuth2 password grant según documentación oficial de Factus:
 * POST {base}/oauth/token, cuerpo form-urlencoded (form-data),
 * grant_type=password + client_id + client_secret + username + password.
 */
async function requestOAuthToken(): Promise<string> {
  const { baseUrl, clientId, clientSecret, username, password } = readEnvConfig();

  const body = new URLSearchParams({
    grant_type: "password",
    client_id: clientId,
    client_secret: clientSecret,
    username,
    password,
  });

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });
  } catch {
    throw new FactusClientUnavailableError("No se pudo contactar a Factus para autenticación");
  }

  if (!response.ok) {
    throw new FactusAuthError(
      "Factus rechazó la autenticación OAuth. Verifica FACTUS_CLIENT_ID, FACTUS_CLIENT_SECRET, FACTUS_USERNAME y FACTUS_PASSWORD."
    );
  }

  let data: FactusTokenResponse;
  try {
    data = await response.json();
  } catch {
    throw new FactusAuthError("Factus no devolvió una respuesta OAuth válida");
  }

  if (!data.access_token) {
    throw new FactusAuthError("Factus no devolvió un access_token");
  }

  const expiresInMs = (Number(data.expires_in) || 3600) * 1000;
  tokenCache = { accessToken: data.access_token, expiresAt: Date.now() + expiresInMs };
  return data.access_token;
}

/** Devuelve el access_token vigente (obteniendo/renovando si hace falta). */
export async function getAccessToken(): Promise<string> {
  if (isTokenValid() && tokenCache) {
    return tokenCache.accessToken;
  }
  return requestOAuthToken();
}

async function parseJsonSafe(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function safeErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (typeof record.message === "string") return record.message.slice(0, 300);
    if (typeof record.error === "string") return record.error.slice(0, 300);
  }
  return `Factus respondió con HTTP ${status}`;
}

async function requestWithBearer(path: string, init?: RequestInit): Promise<Response> {
  const { baseUrl } = readEnvConfig();
  const token = await getAccessToken();

  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(init?.headers || {}),
    },
  });
}

/** GET/POST autenticado con reintento único ante 401. */
async function authenticatedRequest(path: string, init?: RequestInit): Promise<Response> {
  let response = await requestWithBearer(path, init);

  if (response.status === 401) {
    invalidateTokenCache();
    response = await requestWithBearer(path, init);
  }

  return response;
}

async function handleApiResponse<T>(response: Response, kind: "resource" | "validate"): Promise<T> {
  const data = await parseJsonSafe(response);

  if (response.ok) return data as T;

  if (response.status === 401 || response.status === 403) {
    throw new FactusAuthError("Factus rechazó el token de acceso");
  }

  if (kind === "validate" && (response.status === 400 || response.status === 422)) {
    throw new FactusValidationError(safeErrorMessage(data, response.status));
  }

  throw new FactusClientUnavailableError(safeErrorMessage(data, response.status));
}

/** Consulta los rangos de numeración disponibles. */
export async function getNumberingRanges(): Promise<FactusNumberingRange[]> {
  const response = await authenticatedRequest("/v2/numbering-ranges");
  const data = await handleApiResponse<unknown>(response, "resource");

  if (Array.isArray(data)) return data as FactusNumberingRange[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as FactusNumberingRange[];
    if (Array.isArray(record.numbering_ranges)) return record.numbering_ranges as FactusNumberingRange[];
  }
  return [];
}

/** Envía una factura a Factus (endpoint de validación de la skill). */
export async function createInvoice(payload: FactusInvoicePayload): Promise<FactusInvoiceResponse> {
  const response = await authenticatedRequest("/v2/bills/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await handleApiResponse<FactusInvoiceResponse>(response, "validate");

  if (!result || typeof result !== "object" || !("data" in result)) {
    throw new FactusValidationError("Factus no devolvió los datos de la factura validada");
  }

  return result;
}