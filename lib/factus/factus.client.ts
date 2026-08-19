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
  FactusRateLimitError,
  FactusNotFoundError,
} from "./errors";
import { FactusInvoicePayload, FactusInvoiceResponse, FactusNumberingRange, FactusTokenResponse } from "./types";

interface TokenCacheEntry {
  accessToken: string;
  expiresAt: number; // epoch ms
}

const TOKEN_FRESH_BUFFER_MS = 60_000;

/** Timeout centralizado para todas las llamadas HTTP a Factus (OAuth + API). */
export const FACTUS_HTTP_TIMEOUT_MS = 15_000;

let tokenCache: TokenCacheEntry | null = null;

/**
 * fetch con timeout centralizado.
 *
 * Si Factus no responde en FACTUS_HTTP_TIMEOUT_MS, se aborta el request y se
 * convierte el AbortError en FactusClientUnavailableError con un mensaje
 * seguro (sin token, credenciales ni body). Este error NO dispara el retry
 * por 401 de authenticatedRequest, por lo que el timeout nunca provoca un
 * segundo envío de factura.
 */
async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FACTUS_HTTP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new FactusClientUnavailableError(
        "Factus no respondió a tiempo. Revisa la conectividad con Factus e inténtalo nuevamente."
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

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
    response = await fetchWithTimeout(`${baseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body,
    });
  } catch (error) {
    if (error instanceof FactusClientUnavailableError) throw error;
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

/** Longitud máxima del mensaje de error almacenable/con visible al usuario. */
const MAX_ERROR_LENGTH = 300;

/** Campos de Factus que NUNCA pueden terminar en un mensaje de error. */
export const SENSITIVE_FIELD_RE =
  /(access_token|refresh_token|client_secret|secret|password|passwd|username|user_name|authorization|bearer|cookie|credential)/i;

/** Claves cuyo valor es texto de mensaje (no metadata con llave). */
const MESSAGE_KEY_RE = /^(message|error|detail|description|text|reason)$/i;

/** Extrae un mensaje de error solo si es string útil y no parece un secreto. */
function pushSafeMessage(out: string[], value: unknown): void {
  if (typeof value !== "string") return;
  const s = value.trim();
  if (!s || SENSITIVE_FIELD_RE.test(s)) return;
  out.push(s);
}

/**
 * Recorre data.errors (string, array de strings, array de objetos con
 * message/error/detail, o mapa campo -> mensaje) extrayendo mensajes útiles.
 * Profundidad acotada para no volcar respuestas completas.
 */
function extractFactusErrors(out: string[], value: unknown, depth = 0): void {
  if (value == null || depth > 2) return;

  if (typeof value === "string") {
    pushSafeMessage(out, value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) extractFactusErrors(out, item, depth + 1);
    return;
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    // Objeto con message/error/detail/description/...
    for (const key of Object.keys(record)) {
      if (MESSAGE_KEY_RE.test(key) && !SENSITIVE_FIELD_RE.test(key)) {
        pushSafeMessage(out, record[key]);
      }
    }

    // Mapa campo -> mensaje (ej. { tax_rate: "El campo tax_rate es requerido" })
    for (const [key, child] of Object.entries(record)) {
      if (SENSITIVE_FIELD_RE.test(key)) continue;
      if (MESSAGE_KEY_RE.test(key)) continue;
      if (typeof child === "string" && child.trim() && !SENSITIVE_FIELD_RE.test(child)) {
        out.push(`${key}: ${child.trim()}`);
      } else if (child !== null && (typeof child === "object" || Array.isArray(child))) {
        extractFactusErrors(out, child, depth + 1);
      }
    }
  }
}

function safeErrorMessage(data: unknown, status: number): string {
  const messages: string[] = [];

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    pushSafeMessage(messages, record.message);
    pushSafeMessage(messages, record.error);

    const nested = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : null;
    const errors = nested && "errors" in nested ? nested.errors : record.errors;
    if (errors !== undefined) extractFactusErrors(messages, errors);
  }

  const unique = Array.from(new Set(messages));
  const text = unique.join("; ").slice(0, MAX_ERROR_LENGTH);
  return text || `Factus respondió con HTTP ${status}`;
}

async function requestWithBearer(path: string, init?: RequestInit): Promise<Response> {
  const { baseUrl } = readEnvConfig();
  const token = await getAccessToken();

  return fetchWithTimeout(`${baseUrl}${path}`, {
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

  if (response.status === 429) {
    const retryAfter = parseRetryAfter(response);
    throw new FactusRateLimitError(safeErrorMessage(data, response.status), retryAfter);
  }

  if (response.status === 404) {
    throw new FactusNotFoundError(safeErrorMessage(data, response.status));
  }

  if (kind === "validate" && (response.status === 400 || response.status === 422)) {
    throw new FactusValidationError(safeErrorMessage(data, response.status));
  }

  throw new FactusClientUnavailableError(safeErrorMessage(data, response.status));
}

/**
 * Extrae de forma segura el header Retry-After de Factus (solo un entero
 * positivo en segundos). Devuelve undefined si no existe o no es parseable.
 * Nunca se conservan headers completos.
 */
function parseRetryAfter(response: Response): number | undefined {
  const raw = response.headers.get("retry-after");
  if (!raw) return undefined;
  const seconds = Number(raw);
  if (!Number.isInteger(seconds) || seconds <= 0) return undefined;
  return seconds;
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

/**
 * Una factura de Factus en modo consulta (GET). Solo los campos mínimos que la
 * documentación oficial de Factus expone en las respuestas de consulta y que la
 * reconciliación necesita; no se asume ningún campo inventado.
 */
export interface FactusBill {
  reference_code?: string;
  number?: string;
  is_validated?: boolean | number;
  validated_at?: string | null;
  cufe?: string;
  totals?: Record<string, unknown> | null;
  links?: { qr?: string; public_url?: string } | null;
  [key: string]: unknown;
}

/**
 * Consulta facturas en Factus filtrando por reference_code (nuestra clave de
 * idempotencia), según la documentación oficial:
 *
 *   GET /v2/bills?filter[reference_code]=...
 *
 * Respuesta confirmada en Sandbox: `200` con `data.data` = array de facturas
 * (vacío si no hay coincidencias) además de `data.pagination`. Es una operación
 * de SOLO LECTURA: nunca emite ni reenvía facturas.
 */
export async function getBills(filter: { referenceCode: string }): Promise<FactusBill[]> {
  const qs = new URLSearchParams({ "filter[reference_code]": filter.referenceCode });
  const response = await authenticatedRequest(`/v2/bills?${qs.toString()}`);
  const data = await handleApiResponse<unknown>(response, "resource");

  if (!data || typeof data !== "object") {
    throw new FactusClientUnavailableError(
      "Factus no devolvió una consulta interpretable. Revisa la conectividad e inténtalo nuevamente."
    );
  }

  const record = data as Record<string, unknown>;
  const nested = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : null;

  // Estructura documentada y confirmada en Sandbox: data.data = array (puede
  // ser vacío cuando no hay coincidencias; eso es un resultado VÁLIDO).
  if (nested && Array.isArray(nested.data)) return nested.data as FactusBill[];

  // Variante defensiva documentada de la misma API: data.list = array.
  if (nested && Array.isArray(nested.list)) return nested.list as FactusBill[];

  // Variante legada de la misma documentación: data plano como array.
  if (Array.isArray(record.data)) return record.data as FactusBill[];

  // Contenedor irreconocible: NO se asume "no encontrada" (podría ocultar una
  // factura pendiente). Error explícito y seguro; la reconciliación preserva
  // el estado sin cambios.
  throw new FactusClientUnavailableError(
    "La consulta a Factus devolvió una estructura inesperada. Se requiere revisión manual."
  );
}

/**
 * Campos de factura con los que se reconoce una factura válida en las
 * respuestas de consulta (confirmados en Sandbox y en la documentación de
 * Factus). Si ningún campo está presente, el contenedor no es una factura.
 */
const BILL_FIELD_KEYS: readonly string[] = [
  "reference_code",
  "number",
  "is_validated",
  "validated_at",
  "cufe",
  "totals",
  "links",
];

function isFactusBillLike(value: Record<string, unknown>): boolean {
  return BILL_FIELD_KEYS.some((key) => key in value);
}

/**
 * Devuelve una factura específica por su número, según la documentación oficial:
 *
 *   GET /v2/bills/:number
 *
 * Respuesta confirmada en Sandbox: `200` con los datos de la factura en `data`
 * (campos `number`, `cufe`, `is_validated`, `validated_at`, `totals`, `links`).
 * SOLO LECTURA. Un 404 se propaga como FactusNotFoundError vía handleApiResponse.
 *
 * Envolturas soportadas (todas respaldadas por documentación/sandbox/tests):
 * - formato v1 legacy: `data.bill` con los campos de la factura;
 * - formato actual (confirmado en Sandbox): `data` contiene la factura
 *   directamente.
 *
 * Si el contenedor no es reconocible o carece de una factura, se lanza un error
 * seguro: nunca se devuelve `undefined` ni se asume una factura válida.
 */
export async function getBillByNumber(number: string): Promise<FactusBill> {
  const response = await authenticatedRequest(`/v2/bills/${encodeURIComponent(number)}`);
  const result = await handleApiResponse<unknown>(response, "resource");

  if (!result || typeof result !== "object") {
    throw new FactusClientUnavailableError(
      "Factus no devolvió una respuesta interpretable. Revisa la conectividad e inténtalo nuevamente."
    );
  }

  const record = result as Record<string, unknown>;
  if (!record.data || typeof record.data !== "object") {
    throw new FactusClientUnavailableError(
      "La consulta a Factus devolvió una estructura inesperada. Se requiere revisión manual."
    );
  }

  const nested = record.data as Record<string, unknown>;
  const candidate =
    nested.bill && typeof nested.bill === "object" ? (nested.bill as Record<string, unknown>) : nested;

  if (!isFactusBillLike(candidate)) {
    throw new FactusClientUnavailableError(
      "Factus no devolvió los datos de la factura solicitada. Se requiere revisión manual."
    );
  }

  return candidate as FactusBill;
}