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
});