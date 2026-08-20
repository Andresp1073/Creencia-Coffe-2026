import { queryMany } from "@/lib/db";
import { safeJsonParse } from "@/lib/security/safe-error";
import {
  getInvoiceStatusInfo,
  parseInvoiceError,
} from "@/lib/admin/invoice-status";

/** Fila enriquecida para la pantalla /admin/facturas (Fase 4B + 6F). */
export interface AdminInvoice {
  id: number;
  order_id: number;
  reference_code: string;
  status: string;
  number: string | null;
  cufe: string | null;
  is_validated: boolean;
  validated_at: string | null;
  created_at: string;
  /** Label del cliente facturado: customer_snapshot (exacto enviado a Factus), fallback al nombre de la orden. */
  customer: string | null;
  /** Total de la factura (totals.total de la respuesta de Factus), si ya validó. */
  total: number | null;
  attempts: number;
  last_attempt_at: string | null;
  /** Label administrativo del estado (Fase 6F). */
  status_label: string;
  /** Mensaje administrativo del estado (Fase 6F). */
  status_message: string;
  /** "Intentos: n/máx" o el mensaje de límite alcanzado (Fase 6F). */
  attempts_label: string;
  /** El backend decide si el estado admite reintento (Fase 6E/6F). */
  retriable: boolean;
  /** Razón que bloquea el reintento, si aplica. */
  blocked_reason: string | null;
  /** processing: marcado para reconciliación manual (Fase 6F). */
  requires_reconciliation: boolean;
  /** Error sanitizado de F3 (nombre de la clase de error). */
  error_name: string | null;
  /** Error sanitizado de F3 (mensaje ≤300, sin secretos). */
  error_message: string | null;
  payment_form: string | null;
  payment_method_code: string | null;
}

function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (typeof value === "string" && value.trim() !== "")
    return safeJsonParse<T>(value, fallback);
  if (value && typeof value === "object" && !Array.isArray(value))
    return value as T;
  return fallback;
}

/** Convierte valores Date de mysql2 (TiDB) a ISO string para render seguro en cliente. */
function toIsoString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim() !== "") return value;
  if (typeof value === "object") return null;
  return String(value as number | boolean | bigint);
}

export function mapInvoiceForAdmin(row: Record<string, any>): AdminInvoice {
  const totals = parseJsonColumn<{ total?: string | number } | null>(
    row.totals,
    null,
  );
  const snapshot = parseJsonColumn<Record<string, any> | null>(
    row.customer_snapshot,
    null,
  );
  const customer =
    (snapshot?.names as string) ||
    (snapshot?.company as string) ||
    (typeof snapshot?.identification === "string"
      ? snapshot.identification
      : null) ||
    (row.order_customer as string) ||
    null;

  const statusInfo = getInvoiceStatusInfo(
    String(row.status ?? "pending"),
    Number(row.attempts ?? 0),
  );
  const parsedError = parseInvoiceError(row.error ?? null);

  return {
    id: Number(row.id),
    order_id: Number(row.order_id),
    reference_code: String(row.reference_code),
    status: statusInfo.status,
    number: row.number ?? null,
    cufe: row.cufe ?? null,
    is_validated: Number(row.is_validated) === 1,
    validated_at: toIsoString(row.validated_at),
    created_at: toIsoString(row.created_at) ?? "",
    customer,
    total: totals?.total !== undefined ? Number(totals.total) : null,
    attempts: statusInfo.attempts,
    last_attempt_at: toIsoString(row.last_attempt_at),
    status_label: statusInfo.label,
    status_message: statusInfo.message,
    attempts_label: statusInfo.attemptsLabel,
    retriable: statusInfo.retriable,
    blocked_reason: statusInfo.blockedReason,
    requires_reconciliation: statusInfo.requiresReconciliation,
    error_name: parsedError?.name ?? null,
    error_message: parsedError?.message ?? null,
    payment_form: row.payment_form ?? null,
    payment_method_code: row.payment_method_code ?? null,
  };
}

export async function getInvoices(): Promise<AdminInvoice[]> {
  const rows = await queryMany<any>(
    `SELECT i.id, i.order_id, i.reference_code, i.status, i.number, i.cufe,
            i.is_validated, i.validated_at, i.created_at, i.totals, i.error,
            i.attempts, i.last_attempt_at, i.customer_snapshot,
            o.customer_name AS order_customer,
            o.payment_form, o.payment_method_code
     FROM invoices i
     LEFT JOIN orders o ON o.id = i.order_id
     ORDER BY i.id DESC`,
  );
  return rows.map(mapInvoiceForAdmin);
}
