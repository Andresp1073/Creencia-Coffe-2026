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