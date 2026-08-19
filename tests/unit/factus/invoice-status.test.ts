import { describe, expect, it } from "vitest";
import { getInvoiceStatusInfo, parseInvoiceError, INVOICE_STATUS_MESSAGES } from "@/lib/admin/invoice-status";
import { MAX_INVOICE_SEND_ATTEMPTS } from "@/lib/factus/invoice.service";

describe("Fase 6F - mensajes administrativos por estado", () => {
  it("pending produce el mensaje correcto y es reintentable", () => {
    const info = getInvoiceStatusInfo("pending", 0);
    expect(info.status).toBe("pending");
    expect(info.message).toBe(INVOICE_STATUS_MESSAGES.pending);
    expect(info.retriable).toBe(true);
    expect(info.requiresReconciliation).toBe(false);
  });

  it("processing produce el mensaje de reconciliación y NO es reintentable", () => {
    const info = getInvoiceStatusInfo("processing", 1);
    expect(info.status).toBe("processing");
    expect(info.message).toContain("Requiere reconciliación");
    expect(info.message).toContain("No se reenviará automáticamente");
    expect(info.retriable).toBe(false);
    expect(info.requiresReconciliation).toBe(true);
    expect(info.blockedReason).toBeNull();
  });

  it("validated produce el mensaje correcto y NO es reintentable", () => {
    const info = getInvoiceStatusInfo("validated", 2);
    expect(info.status).toBe("validated");
    expect(info.message).toBe("Factura validada correctamente.");
    expect(info.retriable).toBe(false);
  });

  it("cancelled produce el mensaje correcto y NO es reintentable", () => {
    const info = getInvoiceStatusInfo("cancelled", 1);
    expect(info.status).toBe("cancelled");
    expect(info.message).toBe("La factura fue cancelada y no puede reenviarse.");
    expect(info.retriable).toBe(false);
  });

  it("failed produce el mensaje de reintento y es reintentable bajo el límite", () => {
    const info = getInvoiceStatusInfo("failed", 1);
    expect(info.status).toBe("failed");
    expect(info.message).toContain("Puede reintentarse");
    expect(info.retriable).toBe(true);
    expect(info.blockedReason).toBeNull();
  });

  it("estado desconocido degrada a pending sin inventar estados nuevos", () => {
    const info = getInvoiceStatusInfo("weird-status", 0);
    expect(info.status).toBe("pending");
    expect(info.message).toBe(INVOICE_STATUS_MESSAGES.pending);
  });
});

describe("Fase 6F - attempts seguro", () => {
  it("muestra Intentos: 1/3 correctamente", () => {
    const info = getInvoiceStatusInfo("failed", 1);
    expect(info.attemptsLabel).toBe("Intentos: 1/3");
    expect(info.attempts).toBe(1);
  });

  it("failed 1/3 permite retry", () => {
    const info = getInvoiceStatusInfo("failed", 1);
    expect(info.retriable).toBe(true);
    expect(info.attempts < MAX_INVOICE_SEND_ATTEMPTS).toBe(true);
  });

  it("failed justo bajo el límite permite retry", () => {
    const info = getInvoiceStatusInfo("failed", MAX_INVOICE_SEND_ATTEMPTS - 1);
    expect(info.retriable).toBe(true);
  });

  it("failed 3/3 NO permite retry y bloquea con revisión manual", () => {
    const info = getInvoiceStatusInfo("failed", MAX_INVOICE_SEND_ATTEMPTS);
    expect(info.retriable).toBe(false);
    expect(info.attempts).toBe(MAX_INVOICE_SEND_ATTEMPTS);
    expect(info.blockedReason).toContain("límite de intentos");
    expect(info.blockedReason).toContain("revisión manual");
    expect(info.attemptsLabel).toContain("límite de intentos");
  });

  it("failed por encima del límite sigue bloqueada", () => {
    const info = getInvoiceStatusInfo("failed", MAX_INVOICE_SEND_ATTEMPTS + 5);
    expect(info.retriable).toBe(false);
    expect(info.blockedReason).toContain("límite de intentos");
  });

  it("processing nunca permite retry", () => {
    expect(getInvoiceStatusInfo("processing", 0).retriable).toBe(false);
    expect(getInvoiceStatusInfo("processing", MAX_INVOICE_SEND_ATTEMPTS).retriable).toBe(false);
  });

  it("validated nunca permite retry", () => {
    expect(getInvoiceStatusInfo("validated", 0).retriable).toBe(false);
    expect(getInvoiceStatusInfo("validated", 1).retriable).toBe(false);
  });

  it("cancelled nunca permite retry", () => {
    expect(getInvoiceStatusInfo("cancelled", 0).retriable).toBe(false);
  });

  it("attempts no numéricos/negativos se normalizan sin romper", () => {
    const neg = getInvoiceStatusInfo("failed", -3);
    expect(neg.attempts).toBe(0);
    expect(neg.retriable).toBe(true);
    const nan = getInvoiceStatusInfo("failed", Number.NaN);
    expect(nan.attempts).toBe(0);
  });
});

describe("Fase 6F - error sanitizado", () => {
  it("parsea el JSON seguro de F3 y lo muestra legible", () => {
    const parsed = parseInvoiceError(JSON.stringify({ phase: "factus", name: "FactusValidationError", message: "campo items inválido" }));
    expect(parsed).toEqual({ name: "FactusValidationError", message: "campo items inválido" });
  });

  it("error null devuelve null", () => {
    expect(parseInvoiceError(null)).toBeNull();
    expect(parseInvoiceError(undefined as unknown as string)).toBeNull();
  });

  it("mensaje demasiado largo se trunca a 300 caracteres", () => {
    const parsed = parseInvoiceError(JSON.stringify({ name: "E", message: "x".repeat(500) }));
    expect(parsed!.message.length).toBeLessThanOrEqual(300);
    expect(parsed!.name.length).toBeLessThanOrEqual(300);
  });

  it("valor no JSON (datos antiguos) se muestra como texto acotado", () => {
    const parsed = parseInvoiceError("error crudo sin formato");
    expect(parsed).toEqual({ name: "FactusError", message: "error crudo sin formato" });
  });

  it("el error NO contiene secretos (access_token, client_secret, password): el mensaje se suprime", () => {
    const raw = JSON.stringify({
      name: "FactusValidationError",
      message: "validación con access_token=abc client_secret=def password=ghi",
    });
    const parsed = parseInvoiceError(raw)!;
    expect(parsed.message).not.toContain("access_token=abc");
    expect(parsed.message).not.toContain("client_secret=def");
    expect(parsed.message).not.toContain("password=ghi");
    expect(parsed.message).toContain("información sensible");
  });

  it("no hace JSON.stringify de respuestas completas: solo name+message", () => {
    const parsed = parseInvoiceError(
      JSON.stringify({
        name: "FactusValidationError",
        message: "falló",
        data: { errors: [], request_body: { items: [] }, headers: { Authorization: "Bearer x" } },
      })
    );
    expect(parsed).toEqual({ name: "FactusValidationError", message: "falló" });
    expect(JSON.stringify(parsed)).not.toContain("Authorization");
    expect(JSON.stringify(parsed)).not.toContain("request_body");
  });
});
