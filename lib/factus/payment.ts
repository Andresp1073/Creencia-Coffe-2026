/**
 * Catálogo y validación de datos de pago de ventas (Fase 4A Factus).
 *
 * Centraliza payment_form / payment_method_code / payment_reference /
 * payment_due_date para que backend y frontend compartan una única fuente de
 * verdad (backend + modal).
 *
 * Catálogo VERIFICADO contra la documentación oficial de Factus
 * (developers.factus.com.co - tablas de referencia / campos de la factura):
 *   - payment_form: "1" = contado, "2" = crédito
 *   - payment_method_code: "10" = efectivo, "42" = consignación
 * Estos códigos NO deben modificarse. Para agregar un método nuevo basta con
 * agregar una entrada a PAYMENT_METHODS.
 */

import { ValidationError } from "@/lib/security/safe-error";

export interface PaymentFormConfig {
  code: string;
  label: string;
}

export interface PaymentMethodConfig {
  code: string;
  label: string;
  requiresReference: boolean;
}

/**
 * payment_form: "1" = contado, "2" = crédito.
 * Son los mismos códigos que valida resolvePayment en invoice.service.ts.
 */
export const PAYMENT_FORMS: PaymentFormConfig[] = [
  { code: "1", label: "Contado" },
  { code: "2", label: "Crédito" },
];

export const PAYMENT_FORM_BY_CODE: Record<string, PaymentFormConfig> =
  Object.fromEntries(PAYMENT_FORMS.map((form) => [form.code, form]));

/**
 * Métodos de pago. Catálogo verificado contra la documentación oficial de Factus.
 * "10" (efectivo) y "42" (consignación) son los códigos en uso.
 */
export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  { code: "10", label: "Efectivo", requiresReference: false },
  { code: "42", label: "Consignación", requiresReference: true },
];

export const PAYMENT_METHOD_BY_CODE: Record<string, PaymentMethodConfig> =
  Object.fromEntries(PAYMENT_METHODS.map((method) => [method.code, method]));

export const PAYMENT_METHODS_PENDING_DIAN_VERIFICATION = false;

/** Columna orders.payment_reference es VARCHAR(50). */
export const PAYMENT_REFERENCE_MAX_LENGTH = 50;

/** Formato DIAN para vencimientos de crédito: YYYY-MM-DD. */
const PAYMENT_DUE_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ResolvedPayment {
  paymentForm: string;
  paymentMethodCode: string;
  /** Solo se persiste cuando el método lo requiere; si no, siempre null. */
  paymentReference: string | null;
  /** Vencimiento (YYYY-MM-DD) SOLO para crédito (payment_form="2"); null en contado. */
  paymentDueDate: string | null;
}

/**
 * Valida y normaliza los datos de pago de una venta nueva.
 *
 * - payment_form y payment_method_code son obligatorios (no se inventan defaults).
 * - payment_reference es obligatoria solo cuando el método la requiere.
 * - Si el método no la requiere, se descarta el valor enviado (se persiste null):
 *   evita guardar referencias sin sentido para la facturación posterior.
 * - payment_due_date (YYYY-MM-DD) es obligatorio cuando payment_form = "2" (crédito),
 *   porque Factus lo exige en payment_details al facturar. En contado se descarta.
 * - El valor enviado por el cliente no es confiable: se revalida y sanea aquí.
 */
function optionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function requirePresent(value: string, message: string): void {
  if (!value) throw new ValidationError(message);
}

function validateReference(value: string, label: string): string {
  if (!value)
    throw new ValidationError(`payment_reference es requerido para ${label}`);
  return sanitizeReference(value);
}

function validateDueDate(value: string): string {
  if (!value) {
    throw new ValidationError(
      "payment_due_date es requerido para crédito (payment_form=2)",
    );
  }
  if (!PAYMENT_DUE_DATE_RE.test(value) || !isValidCalendarDate(value)) {
    throw new ValidationError(
      "payment_due_date debe tener formato YYYY-MM-DD y ser una fecha válida",
    );
  }
  return value;
}

export function resolvePaymentData(raw: unknown): ResolvedPayment {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  const paymentForm = optionalString(body.payment_form);
  const paymentMethodCode = optionalString(body.payment_method_code);

  requirePresent(paymentForm, "payment_form es requerido");
  const form = paymentForm ? PAYMENT_FORM_BY_CODE[paymentForm] : undefined;
  if (!form) {
    throw new ValidationError(
      `payment_form inválido: ${paymentForm} no es un código válido`,
    );
  }

  requirePresent(paymentMethodCode, "payment_method_code es requerido");
  const method = paymentMethodCode
    ? PAYMENT_METHOD_BY_CODE[paymentMethodCode]
    : undefined;
  if (!method) {
    throw new ValidationError(
      `payment_method_code inválido: ${paymentMethodCode} no está en el catálogo`,
    );
  }

  const paymentReference = method.requiresReference
    ? validateReference(optionalString(body.payment_reference), method.label)
    : null;
  const paymentDueDate =
    form.code === "2"
      ? validateDueDate(optionalString(body.payment_due_date))
      : null;

  return {
    paymentForm: form.code,
    paymentMethodCode: method.code,
    paymentReference,
    paymentDueDate,
  };
}

function sanitizeReference(value: string): string {
  return value.replace(/[<>]/g, "").slice(0, PAYMENT_REFERENCE_MAX_LENGTH);
}

function isValidCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
