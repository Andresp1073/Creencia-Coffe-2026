import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryMany } from "@/lib/db";
import { getInvoices, mapInvoiceForAdmin } from "@/lib/admin/invoices";

vi.mock("@/lib/db", () => ({ queryMany: vi.fn() }));

beforeEach(() => {
  vi.mocked(queryMany).mockReset();
});

describe("lib/admin/invoices - lista de /admin/facturas", () => {
  it("mapea total desde totals JSON, cliente desde customer_snapshot y estado boolean", () => {
    const row = {
      id: 1,
      order_id: 5,
      reference_code: "FACT-5",
      status: "validated",
      number: "SETP100",
      cufe: "abc123",
      is_validated: 1,
      validated_at: "13-05-2026 08:00:00 AM",
      created_at: "2026-05-12T10:00:00Z",
      totals: '{"total":"50000.00","tax_amount":"7983.20"}',
      error: null,
      customer_snapshot: '{"names":"Juan Pérez","identification":"123456789"}',
      order_customer: "Juan",
      payment_form: "1",
      payment_method_code: "10",
    };

    const mapped = mapInvoiceForAdmin(row);

    expect(mapped.total).toBe(50000);
    expect(mapped.is_validated).toBe(true);
    expect(mapped.customer).toBe("Juan Pérez");
    expect(mapped.number).toBe("SETP100");
    expect(mapped.cufe).toBe("abc123");
    expect(mapped.payment_form).toBe("1");
    expect(mapped.payment_method_code).toBe("10");
  });

  it("usa company en customer_snapshot para persona jurídica", () => {
    const mapped = mapInvoiceForAdmin({
      id: 2,
      order_id: 6,
      reference_code: "FACT-6",
      status: "failed",
      number: null,
      cufe: null,
      is_validated: 0,
      validated_at: null,
      created_at: "2026-05-12",
      totals: null,
      error: '{"phase":"factus","message":"x"}',
      customer_snapshot: '{"company":"Alan Company SAS","identification":"901234567"}',
      order_customer: "Alan",
      payment_form: "2",
      payment_method_code: "42",
    });

    expect(mapped.customer).toBe("Alan Company SAS");
    expect(mapped.total).toBeNull();
    expect(mapped.is_validated).toBe(false);
  });

  it("convierte fechas Date (mysql2/TiDB) a ISO string para render seguro", () => {
    const row = {
      id: 1,
      order_id: 5,
      reference_code: "FACT-5",
      status: "validated",
      number: "SETP100",
      cufe: "abc123",
      is_validated: 1,
      validated_at: new Date("2026-05-13T08:21:49.000Z"),
      created_at: new Date("2026-05-12T10:00:00.000Z"),
      totals: { total: "50000.00", tax_amount: "7983.20" },
      error: null,
      customer_snapshot: { names: "Juan Pérez", identification: "123456789" },
      order_customer: "Juan",
      payment_form: "1",
      payment_method_code: "10",
    };

    const mapped = mapInvoiceForAdmin(row);

    expect(mapped.validated_at).toBe("2026-05-13T08:21:49.000Z");
    expect(mapped.created_at).toBe("2026-05-12T10:00:00.000Z");
    expect(mapped.total).toBe(50000);
    expect(mapped.customer).toBe("Juan Pérez");
  });

  it("getInvoices consulta y mapea las filas enriquecidas", async () => {
    vi.mocked(queryMany).mockResolvedValue([
      {
        id: 10,
        order_id: 7,
        reference_code: "FACT-7",
        status: "processing",
        number: null,
        cufe: null,
        is_validated: 0,
        validated_at: null,
        created_at: "2026-05-12",
        totals: null,
        error: null,
        attempts: 1,
        last_attempt_at: null,
        customer_snapshot: null,
        order_customer: "Histórico",
        payment_form: null,
        payment_method_code: null,
      },
    ] as any);

    const list = await getInvoices();

    expect(vi.mocked(queryMany)).toHaveBeenCalledOnce();
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe("processing");
    expect(list[0].customer).toBe("Histórico");
    expect(list[0].total).toBeNull();
  });

  it("Fase 6F: expone mensaje, attempts, retriable y reconciliación según el estado", () => {
    const failed = mapInvoiceForAdmin({
      id: 3,
      order_id: 8,
      reference_code: "FACT-8",
      status: "failed",
      number: null,
      cufe: null,
      is_validated: 0,
      validated_at: null,
      created_at: "2026-05-12",
      totals: null,
      error: '{"phase":"factus","name":"FactusValidationError","message":"campo inválido"}',
      attempts: 2,
      last_attempt_at: "2026-05-12T11:00:00Z",
      customer_snapshot: null,
      order_customer: "A",
      payment_form: null,
      payment_method_code: null,
    });

    expect(failed.status).toBe("failed");
    expect(failed.status_message).toContain("Puede reintentarse");
    expect(failed.attempts).toBe(2);
    expect(failed.attempts_label).toBe("Intentos: 2/3");
    expect(failed.retriable).toBe(true);
    expect(failed.blocked_reason).toBeNull();
    expect(failed.requires_reconciliation).toBe(false);
    expect(failed.error_name).toBe("FactusValidationError");
    expect(failed.error_message).toBe("campo inválido");

    const processing = mapInvoiceForAdmin({
      id: 4,
      order_id: 9,
      reference_code: "FACT-9",
      status: "processing",
      number: null,
      cufe: null,
      is_validated: 0,
      validated_at: null,
      created_at: "2026-05-12",
      totals: null,
      error: null,
      attempts: 1,
      last_attempt_at: null,
      customer_snapshot: null,
      order_customer: "B",
      payment_form: null,
      payment_method_code: null,
    });

    expect(processing.status_message).toContain("Requiere reconciliación");
    expect(processing.retriable).toBe(false);
    expect(processing.requires_reconciliation).toBe(true);
  });

  it("Fase 6F: failed 3/3 queda bloqueada (no retriable) y conserva el límite alcanzado", () => {
    const mapped = mapInvoiceForAdmin({
      id: 5,
      order_id: 10,
      reference_code: "FACT-10",
      status: "failed",
      number: null,
      cufe: null,
      is_validated: 0,
      validated_at: null,
      created_at: "2026-05-12",
      totals: null,
      error: null,
      attempts: 3,
      last_attempt_at: "2026-05-12T12:00:00Z",
      customer_snapshot: null,
      order_customer: "C",
      payment_form: null,
      payment_method_code: null,
    });

    expect(mapped.retriable).toBe(false);
    expect(mapped.blocked_reason).toContain("límite de intentos");
    expect(mapped.attempts_label).toContain("límite de intentos");
  });
});