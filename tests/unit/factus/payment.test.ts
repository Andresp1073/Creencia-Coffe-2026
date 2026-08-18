import { describe, it, expect } from "vitest";
import {
  resolvePaymentData,
  PAYMENT_FORMS,
  PAYMENT_METHODS,
  PAYMENT_METHODS_PENDING_DIAN_VERIFICATION,
  PAYMENT_REFERENCE_MAX_LENGTH,
} from "@/lib/factus/payment";
import { ValidationError } from "@/lib/security/safe-error";

describe("resolvePaymentData", () => {
  it("acepta contado/efectivo sin referencia", () => {
    const payment = resolvePaymentData({ payment_form: "1", payment_method_code: "10" });
    expect(payment).toEqual({
      paymentForm: "1",
      paymentMethodCode: "10",
      paymentReference: null,
      paymentDueDate: null,
    });
  });

  it("acepta crédito/consignación con referencia requerida", () => {
    const payment = resolvePaymentData({
      payment_form: "2",
      payment_method_code: "42",
      payment_reference: "  CONS-123  ",
      payment_due_date: "2026-06-30",
    });
    expect(payment.paymentForm).toBe("2");
    expect(payment.paymentMethodCode).toBe("42");
    expect(payment.paymentReference).toBe("CONS-123");
    expect(payment.paymentDueDate).toBe("2026-06-30");
  });

  it("rechaza si payment_form falta", () => {
    expect(() => resolvePaymentData({ payment_method_code: "10" })).toThrow(
      /payment_form es requerido/
    );
  });

  it("rechaza si payment_form es inválido", () => {
    expect(() => resolvePaymentData({ payment_form: "9", payment_method_code: "10" })).toThrow(
      /payment_form inválido/
    );
  });

  it("rechaza si payment_method_code falta", () => {
    expect(() => resolvePaymentData({ payment_form: "1" })).toThrow(
      /payment_method_code es requerido/
    );
  });

  it("rechaza si payment_method_code no está en el catálogo", () => {
    expect(() => resolvePaymentData({ payment_form: "1", payment_method_code: "99" })).toThrow(
      /no está en el catálogo/
    );
  });

  it("rechaza si falta payment_reference cuando el método la requiere", () => {
    expect(() =>
      resolvePaymentData({ payment_form: "1", payment_method_code: "42" })
    ).toThrow(/payment_reference es requerido/);
  });

  it("descarta payment_reference enviada cuando el método no la requiere", () => {
    const payment = resolvePaymentData({
      payment_form: "1",
      payment_method_code: "10",
      payment_reference: "sobra",
    });
    expect(payment.paymentReference).toBeNull();
  });

  it("crédito (payment_form=2) sin due_date: rechaza", () => {
    expect(() =>
      resolvePaymentData({ payment_form: "2", payment_method_code: "42", payment_reference: "X" })
    ).toThrow(/payment_due_date es requerido/);
  });

  it("crédito con due_date inválido: rechaza con formato esperado", () => {
    expect(() =>
      resolvePaymentData({
        payment_form: "2",
        payment_method_code: "42",
        payment_reference: "X",
        payment_due_date: "30/06/2026",
      })
    ).toThrow(/YYYY-MM-DD/);
    expect(() =>
      resolvePaymentData({
        payment_form: "2",
        payment_method_code: "10",
        payment_due_date: "2026-02-30",
      })
    ).toThrow(/YYYY-MM-DD/);
  });

  it("crédito con due_date válido: lo preserva", () => {
    const payment = resolvePaymentData({
      payment_form: "2",
      payment_method_code: "10",
      payment_due_date: " 2026-07-15 ",
    });
    expect(payment.paymentDueDate).toBe("2026-07-15");
  });

  it("contado (payment_form=1) descarta payment_due_date enviado", () => {
    const payment = resolvePaymentData({
      payment_form: "1",
      payment_method_code: "10",
      payment_due_date: "2026-07-15",
    });
    expect(payment.paymentDueDate).toBeNull();
  });

  it("lanza ValidationError", () => {
    try {
      resolvePaymentData({ payment_form: "1" });
      throw new Error("no lanzó");
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
    }
  });

  it("sanea la referencia: quita <> y limita a la longitud de la columna", () => {
    const payment = resolvePaymentData({
      payment_form: "1",
      payment_method_code: "42",
      payment_reference: "<ABCDE>".repeat(30),
    });
    expect(payment.paymentReference).not.toContain("<");
    expect(payment.paymentReference).not.toContain(">");
    expect(payment.paymentReference!.length).toBeLessThanOrEqual(PAYMENT_REFERENCE_MAX_LENGTH);
    expect(payment.paymentReference!.length).toBe(PAYMENT_REFERENCE_MAX_LENGTH);
  });
});

describe("catálogo de pagos", () => {
  it("tiene las formas de pago contado y crédito", () => {
    expect(PAYMENT_FORMS.map((f) => f.code)).toEqual(["1", "2"]);
  });

  it("tiene métodos de pago definidos, verificados contra la doc oficial de Factus", () => {
    expect(PAYMENT_METHODS.length).toBeGreaterThan(0);
    expect(PAYMENT_METHODS_PENDING_DIAN_VERIFICATION).toBe(false);
    for (const method of PAYMENT_METHODS) {
      expect(method.code).toBeTruthy();
      expect(method.label).toBeTruthy();
      expect(typeof method.requiresReference).toBe("boolean");
    }
  });

  it("no repite códigos en el catálogo", () => {
    const codes = PAYMENT_METHODS.map((m) => m.code);
    expect(new Set(codes).size).toBe(codes.length);
  });
});
