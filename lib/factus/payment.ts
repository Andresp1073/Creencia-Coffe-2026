/**
 * Catálogo y validación de datos de pago de ventas (Fase 4A Factus).
 *
 * Centraliza payment_form / payment_method_code / payment_reference para que
 * backend y frontend compartan una única fuente de verdad (backend + modal).
 *
 * IMPORTANTE - PENDIENTE DE VERIFICACIÓN CON FACTUS/DIAN:
 * el proyecto todavía no cuenta con un catálogo oficial confirmado de códigos.
 * Los valores listados aquí son referenciales (documentados en la guía Factus
 * del proyecto) y deben verificarse antes de usarse en producción. Esta
 * estructura es fácilmente configurable: agregar un método nuevo es agregar
 * una entrada a PAYMENT_METHODS.
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

export const PAYMENT_FORM_BY_CODE: Record<string, PaymentFormConfig> = Object.fromEntries(
  PAYMENT_FORMS.map((form) => [form.code, form])
);

/**
 * Métodos de pago. PENDIENTE DE VERIFICACIÓN CON FACTUS/DIAN.
 * "10" y "42" son los códigos documentados en la guía Factus del proyecto;
 * NO están confirmados contra el catálogo oficial.
 */
export const PAYMENT_METHODS: PaymentMethodConfig[] = [
  { code: "10", label: "Efectivo", requiresReference: false },
  { code: "42", label: "Consignación", requiresReference: true },
];

export const PAYMENT_METHOD_BY_CODE: Record<string, PaymentMethodConfig> = Object.fromEntries(
  PAYMENT_METHODS.map((method) => [method.code, method])
);

export const PAYMENT_METHODS_PENDING_DIAN_VERIFICATION = true;

/** Columna orders.payment_reference es VARCHAR(50). */
export const PAYMENT_REFERENCE_MAX_LENGTH = 50;

export interface ResolvedPayment {
  paymentForm: string;
  paymentMethodCode: string;
  /** Solo se persiste cuando el método lo requiere; si no, siempre null. */
  paymentReference: string | null;
}

/**
 * Valida y normaliza los datos de pago de una venta nueva.
 *
 * - payment_form y payment_method_code son obligatorios (no se inventan defaults).
 * - payment_reference es obligatoria solo cuando el método la requiere.
 * - Si el método no la requiere, se descarta el valor enviado (se persiste null):
 *   evita guardar referencias sin sentido para la facturación posterior.
 * - El valor enviado por el cliente no es confiable: se revalida y sanea aquí.
 */
export function resolvePaymentData(raw: unknown): ResolvedPayment {
  const body = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const paymentForm = typeof body.payment_form === "string" ? body.payment_form.trim() : "";
  const paymentMethodCode =
    typeof body.payment_method_code === "string" ? body.payment_method_code.trim() : "";
  const rawReference =
    typeof body.payment_reference === "string" ? body.payment_reference.trim() : "";

  if (!paymentForm) {
    throw new ValidationError("payment_form es requerido");
  }
  const form = PAYMENT_FORM_BY_CODE[paymentForm];
  if (!form) {
    throw new ValidationError(`payment_form inválido: ${paymentForm} no es un código válido`);
  }

  if (!paymentMethodCode) {
    throw new ValidationError("payment_method_code es requerido");
  }
  const method = PAYMENT_METHOD_BY_CODE[paymentMethodCode];
  if (!method) {
    throw new ValidationError(`payment_method_code inválido: ${paymentMethodCode} no está en el catálogo`);
  }

  let paymentReference: string | null = null;
  if (method.requiresReference) {
    if (!rawReference) {
      throw new ValidationError(`payment_reference es requerido para ${method.label}`);
    }
    paymentReference = sanitizeReference(rawReference);
  }

  return {
    paymentForm: form.code,
    paymentMethodCode: method.code,
    paymentReference,
  };
}

function sanitizeReference(value: string): string {
  return value.replace(/[<>]/g, "").slice(0, PAYMENT_REFERENCE_MAX_LENGTH);
}
