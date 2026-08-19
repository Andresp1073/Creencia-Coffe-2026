import { MAX_INVOICE_SEND_ATTEMPTS } from "@/lib/factus/invoice.service";
import { SENSITIVE_FIELD_RE } from "@/lib/factus/factus.client";

/**
 * Fase 6F — Observabilidad administrativa de facturas Factus.
 *
 * Módulo puro (server-side) que traduce el estado de `invoices` a mensajes
 * comprensibles, muestra `attempts` de forma segura y determina qué estados
 * admiten reintento. El backend es la ÚNICA autoridad sobre `attempts` y sobre
 * la retriabilidad: el frontend solo consume estos valores ya calculados.
 *
 * NO invoca a Factus ni modifica la BD.
 */

export const INVOICE_STATUSES = ["pending", "processing", "validated", "failed", "cancelled"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  pending: "Pendiente",
  processing: "Procesando",
  validated: "Validada",
  failed: "Fallida",
  cancelled: "Cancelada",
};

/**
 * Mensaje administrativo por estado. `processing` nunca se reenvía
 * automáticamente (regla de F2/6B) y queda marcado para reconciliación.
 */
export const INVOICE_STATUS_MESSAGES: Record<InvoiceStatus, string> = {
  pending: "Factura pendiente de envío.",
  processing:
    "La solicitud fue enviada a Factus. No se reenviará automáticamente para evitar duplicados. Requiere reconciliación.",
  validated: "Factura validada correctamente.",
  failed: "La factura no pudo ser validada. Puede reintentarse mientras no haya alcanzado el límite de intentos.",
  cancelled: "La factura fue cancelada y no puede reenviarse.",
};

export interface InvoiceStatusInfo {
  status: InvoiceStatus;
  label: string;
  message: string;
  attempts: number;
  attemptsLabel: string;
  /** true solo para pending y para failed con attempts < límite. */
  retriable: boolean;
  /** Razón que bloquea el reintento, si aplica (p. ej. límite de intentos). */
  blockedReason: string | null;
  /** processing: requiere que un humano verifique el estado en Factus. */
  requiresReconciliation: boolean;
}

/**
 * Convierte status + attempts en la información administrativa segura.
 * Los estados desconocidos se degradan a "pending" (sin inventar estados).
 */
export function getInvoiceStatusInfo(status: string, attempts: number): InvoiceStatusInfo {
  const normalized: InvoiceStatus = (INVOICE_STATUSES as readonly string[]).includes(status)
    ? (status as InvoiceStatus)
    : "pending";

  const safeAttempts = Number.isFinite(Number(attempts)) ? Math.max(0, Math.floor(Number(attempts))) : 0;

  let retriable = normalized === "pending" || (normalized === "failed" && safeAttempts < MAX_INVOICE_SEND_ATTEMPTS);
  let blockedReason: string | null = null;
  let attemptsLabel = `Intentos: ${safeAttempts}/${MAX_INVOICE_SEND_ATTEMPTS}`;

  if (normalized === "failed" && safeAttempts >= MAX_INVOICE_SEND_ATTEMPTS) {
    retriable = false;
    blockedReason = "Se alcanzó el límite de intentos. Requiere revisión manual.";
    attemptsLabel = blockedReason;
  }

  return {
    status: normalized,
    label: INVOICE_STATUS_LABELS[normalized],
    message: INVOICE_STATUS_MESSAGES[normalized],
    attempts: safeAttempts,
    attemptsLabel,
    retriable,
    blockedReason,
    requiresReconciliation: normalized === "processing",
  };
}

/** Máxima longitud legible del mensaje de error almacenado (coherente con F3). */
const MAX_ERROR_LENGTH = 300;

/**
 * Parsea el error guardado en `invoices.error` (JSON seguro de F3:
 * { phase, name, message }). Nunca devuelve la respuesta completa de Factus.
 * Si el valor no es JSON (datos antiguos) lo acota como texto plano.
 *
 * Defensa en profundidad: si el mensaje coincide con SENSITIVE_FIELD_RE (misma
 * regla de F3) se suprime, para que ningún token/secreto llegue a la UI aunque
 * un error de otra fase se haya guardado sin sanitizar.
 */
export function parseInvoiceError(raw: string | null): { name: string; message: string } | null {
  if (!raw || typeof raw !== "string") return null;

  let name = "FactusError";
  let message: string | null = null;

  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.name === "string" && parsed.name.trim()) {
        name = parsed.name.trim();
      }
      if (typeof parsed.message === "string" && parsed.message.trim()) {
        message = parsed.message.trim();
      }
    }
  } catch {
    const s = raw.trim();
    if (!s) return null;
    message = s;
  }

  if (!message) return null;

  if (SENSITIVE_FIELD_RE.test(message)) {
    return { name: name.slice(0, MAX_ERROR_LENGTH), message: "Mensaje oculto: contiene información sensible." };
  }

  return { name: name.slice(0, MAX_ERROR_LENGTH), message: message.slice(0, MAX_ERROR_LENGTH) };
}
