import { queryMany } from "@/lib/db";
import { safeJsonParse } from "@/lib/security/safe-error";

/** Fila enriquecida para la pantalla /admin/facturas (Fase 4B). */
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
  error: string | null;
  payment_form: string | null;
  payment_method_code: string | null;
}

function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (typeof value === "string" && value.trim() !== "") return safeJsonParse<T>(value, fallback);
  if (value && typeof value === "object" && !Array.isArray(value)) return value as T;
  return fallback;
}

/** Convierte valores Date de mysql2 (TiDB) a ISO string para render seguro en cliente. */
function toIsoString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" && value.trim() !== "") return value;
  return String(value);
}

export function mapInvoiceForAdmin(row: Record<string, any>): AdminInvoice {
  const totals = parseJsonColumn<{ total?: string | number } | null>(row.totals, null);
  const snapshot = parseJsonColumn<Record<string, any> | null>(row.customer_snapshot, null);
  const customer =
    (snapshot?.names as string) ||
    (snapshot?.company as string) ||
    (typeof snapshot?.identification === "string" ? snapshot.identification : null) ||
    (row.order_customer as string) ||
    null;

  return {
    id: Number(row.id),
    order_id: Number(row.order_id),
    reference_code: String(row.reference_code),
    status: String(row.status),
    number: row.number ?? null,
    cufe: row.cufe ?? null,
    is_validated: Number(row.is_validated) === 1,
    validated_at: toIsoString(row.validated_at),
    created_at: toIsoString(row.created_at) ?? "",
    customer,
    total: totals && totals.total !== undefined ? Number(totals.total) : null,
    error: row.error ?? null,
    payment_form: row.payment_form ?? null,
    payment_method_code: row.payment_method_code ?? null,
  };
}

export async function getInvoices(): Promise<AdminInvoice[]> {
  const rows = await queryMany<any>(
    `SELECT i.id, i.order_id, i.reference_code, i.status, i.number, i.cufe,
            i.is_validated, i.validated_at, i.created_at, i.totals, i.error,
            i.customer_snapshot, o.customer_name AS order_customer,
            o.payment_form, o.payment_method_code
     FROM invoices i
     LEFT JOIN orders o ON o.id = i.order_id
     ORDER BY i.id DESC`
  );
  return rows.map(mapInvoiceForAdmin);
}