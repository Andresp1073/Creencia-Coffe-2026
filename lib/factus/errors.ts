import { AppError } from "@/lib/security/safe-error";

export class FactusConfigError extends AppError {
  constructor(message: string) {
    super(message, 500, true, "FACTUS_CONFIG");
  }
}

export class FactusAuthError extends AppError {
  constructor(message: string) {
    super(message, 502, true, "FACTUS_AUTH");
  }
}

/**
 * Factus rechazó temporalmente la solicitud por rate limit (HTTP 429).
 * NO se reintenta automáticamente: solo informa de forma diferenciada.
 * `retryAfter` (segundos) se conserva ÚNICAMENTE si Factus lo envía en el
 * header Retry-After; nunca se guardan headers completos.
 */
export class FactusRateLimitError extends AppError {
  retryAfter?: number;

  constructor(message: string, retryAfter?: number) {
    super(message, 429, true, "FACTUS_RATE_LIMIT");
    this.retryAfter = retryAfter;
  }
}

/**
 * Factus no encontró el recurso solicitado (HTTP 404). Se diferencia de una
 * indisponibilidad general (timeout, red o 5xx) para que el caller pueda
 * reaccionar de forma distinta (p. ej. validar el numbering range).
 */
export class FactusNotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404, true, "FACTUS_NOT_FOUND");
  }
}

export class FactusClientUnavailableError extends AppError {
  constructor(message: string) {
    super(message, 502, true, "FACTUS_UNAVAILABLE");
  }
}

export class FactusValidationError extends AppError {
  constructor(message: string) {
    super(message, 422, true, "FACTUS_VALIDATION");
  }
}

export class InvoicePayloadError extends AppError {
  constructor(message: string) {
    super(message, 400, true, "INVOICE_PAYLOAD");
  }
}

export class FactusNumberingRangeError extends AppError {
  constructor(message: string) {
    super(message, 500, true, "FACTUS_NUMBERING_RANGE");
  }
}