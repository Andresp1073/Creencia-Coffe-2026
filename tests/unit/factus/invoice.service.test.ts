import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query, queryOne, queryMany } from "@/lib/db";
import { createInvoice, getNumberingRanges } from "@/lib/factus/factus.client";
import { generateInvoice } from "@/lib/factus/invoice.service";
import { NotFoundError, ConflictError } from "@/lib/security/safe-error";
import { FactusValidationError } from "@/lib/factus/errors";

vi.mock("@/lib/factus/factus.client", () => ({
  createInvoice: vi.fn(),
  getNumberingRanges: vi.fn(),
  invalidateTokenCache: vi.fn(),
  getAccessToken: vi.fn(),
}));

const createInvoiceMock = vi.mocked(createInvoice);
const getNumberingRangesMock = vi.mocked(getNumberingRanges);

const orderRow = {
  id: 5,
  total: 50000,
  items: JSON.stringify([{ id: 1, qty: 2, price: 25000, name: "Café Tradicional 500g", presentation: "500g" }]),
  customer_id: 5,
  payment_form: "1",
  payment_method_code: "10",
  payment_reference: null,
};

const productRows = [
  { id: 1, name: "Café Tradicional 500g", code_reference: "CAFE-500", unit_measure_code: "94", standard_code: "999", tax_code: "01", tax_rate: "19.00" },
];

const customerRow = {
  id: 5,
  identification_document_code: "13",
  identification: "123456789",
  dv: null,
  legal_organization_code: "2",
  tribute_code: "ZZ",
  responsibilities: '["R-99-PN"]',
  company: null,
  trade_name: null,
  names: "Juan Pérez",
  address: null,
  email: "juan@email.com",
  phone: null,
  country_code: "CO",
  municipality_code: null,
};

function invoiceRow(overrides: Record<string, unknown> = {}): any {
  return {
    id: 10,
    order_id: 5,
    customer_id: 5,
    customer_snapshot: null,
    reference_code: "FACT-5",
    status: "pending",
    number: null,
    cufe: null,
    is_validated: 0,
    validated_at: null,
    totals: null,
    links: null,
    error: null,
    attempts: 0,
    last_attempt_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

let currentInvoice: any | null;

beforeEach(() => {
  currentInvoice = null;
  process.env.FACTUS_NUMBERING_RANGE_ID = "389";
  delete process.env.FACTUS_SEND_EMAIL;

  vi.mocked(query).mockClear();
  vi.mocked(queryOne).mockClear();
  vi.mocked(queryMany).mockClear();

  vi.mocked(queryOne).mockImplementation((sql: string, params?: any[]) => {
    if (String(sql).includes("FROM orders WHERE")) return Promise.resolve(orderRow);
    if (String(sql).includes("FROM customers WHERE id")) return Promise.resolve(customerRow);
    if (String(sql).includes("SELECT * FROM invoices WHERE order_id")) return Promise.resolve(currentInvoice);
    if (String(sql).includes("SELECT * FROM invoices WHERE id")) return Promise.resolve(currentInvoice);
    return Promise.resolve(null);
  });

  vi.mocked(queryMany).mockImplementation((sql: string) =>
    String(sql).includes("FROM products WHERE")
      ? Promise.resolve(productRows)
      : Promise.resolve([])
  );

  vi.mocked(query).mockImplementation(async (sql: string, params?: any[]) => {
    const text = String(sql);
    if (text.includes("INSERT INTO invoices")) {
      currentInvoice = invoiceRow({ order_id: params?.[0], customer_id: params?.[1], reference_code: params?.[2] });
      return { insertId: currentInvoice.id } as any;
    }
    if (text.includes("status = 'processing'")) {
      currentInvoice = {
        ...currentInvoice,
        status: "processing",
        customer_id: params?.[0],
        customer_snapshot: params?.[1],
        attempts: params?.[2],
      };
      return {} as any;
    }
    if (text.includes("status = 'validated'")) {
      currentInvoice = {
        ...currentInvoice,
        status: "validated",
        number: params?.[0],
        cufe: params?.[1],
        is_validated: params?.[2],
        validated_at: params?.[3],
        totals: params?.[4],
        links: params?.[5],
      };
      return {} as any;
    }
    if (text.includes("status = 'failed'")) {
      currentInvoice = { ...currentInvoice, status: "failed", attempts: params?.[0], error: params?.[1] };
      return {} as any;
    }
    return { insertId: 10 } as any;
  });

  createInvoiceMock.mockReset();
  getNumberingRangesMock.mockReset();
  createInvoiceMock.mockResolvedValue({
    data: { reference_code: "FACT-5", number: "SETP", is_validated: true },
  } as any);
});

afterEach(() => {
  delete process.env.FACTUS_NUMBERING_RANGE_ID;
  delete process.env.FACTUS_SEND_EMAIL;
});

describe("invoice.service.generateInvoice", () => {
  it("lanza NotFoundError si la orden no existe", async () => {
    vi.mocked(queryOne).mockImplementation(async (sql: string) =>
      String(sql).includes("FROM orders WHERE") ? null : null
    );

    await expect(generateInvoice(999)).rejects.toBeInstanceOf(NotFoundError);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it("crea invoice local si no existía (idempotencia: una sola inserción)", async () => {
    currentInvoice = null;
    const result = await generateInvoice(5);

    expect(result.created).toBe(true);
    expect(result.invoice.reference_code).toBe("FACT-5");

    const inserts = vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO invoices"));
    expect(inserts).toHaveLength(1);
  });

  it("no reenvía si la factura ya está validated", async () => {
    currentInvoice = invoiceRow({ status: "validated", number: "SETP99", is_validated: 1 });

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(false);
    expect(createInvoiceMock).not.toHaveBeenCalled();
    expect(result.message).toContain("ya está validada");
  });

  it("no reenvía mientras está processing (pide reconciliación, no duplica)", async () => {
    currentInvoice = invoiceRow({ status: "processing", attempts: 1 });

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(false);
    expect(createInvoiceMock).not.toHaveBeenCalled();
    expect(result.message).toMatch(/reconciliaci/i);
  });

  it("bloquea la factura si la venta no tiene payment_form/payment_method_code", async () => {
    vi.mocked(queryOne).mockImplementation((sql: string) => {
      if (String(sql).includes("FROM orders WHERE")) {
        return Promise.resolve({ ...orderRow, payment_form: null, payment_method_code: null, payment_reference: null });
      }
      return Promise.resolve(null);
    });

    await expect(generateInvoice(5)).rejects.toThrow(/datos de pago antes de facturarse/i);

    expect(createInvoiceMock).not.toHaveBeenCalled();
    const updateCalls = vi.mocked(query).mock.calls.map(([sql]) => String(sql));
    expect(updateCalls.some((sql) => sql.includes("status = 'validated'"))).toBe(false);
    expect(updateCalls.some((sql) => sql.includes("UPDATE orders"))).toBe(false);
    expect(updateCalls.some((sql) => sql.includes("UPDATE products"))).toBe(false);
    expect(updateCalls.some((sql) => /inventory_movements/.test(sql))).toBe(false);
  });

  it("usa payment_form/payment_method_code del request cuando la orden no los tiene", async () => {
    vi.mocked(queryOne).mockImplementation((sql: string) => {
      if (String(sql).includes("FROM orders WHERE")) {
        return Promise.resolve({ ...orderRow, payment_form: null, payment_method_code: null, payment_reference: null });
      }
      if (String(sql).includes("FROM customers WHERE id")) return Promise.resolve(customerRow);
      if (String(sql).includes("SELECT * FROM invoices WHERE")) return Promise.resolve(currentInvoice);
      return Promise.resolve(null);
    });
    currentInvoice = invoiceRow() as any;

    const result = await generateInvoice(5, {
      payment: { payment_form: "1", payment_method_code: "10" },
    });

    expect(result.submitted).toBe(true);
    expect(createInvoiceMock.mock.calls[0][0].payment_details[0]).toEqual({
      payment_form: "1",
      payment_method_code: "10",
      amount: "50000.00",
    });
  });

  it("valida payment_form/payment_method_code inválidos", async () => {
    vi.mocked(queryOne).mockImplementation((sql: string) => {
      if (String(sql).includes("FROM orders WHERE")) {
        return Promise.resolve({ ...orderRow, payment_form: null, payment_method_code: null });
      }
      return Promise.resolve(null);
    });

    await expect(
      generateInvoice(5, { payment: { payment_form: "3", payment_method_code: "10" } })
    ).rejects.toThrow(/payment_form inválido/);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it("reference_code es SIEMPRE FACT-{orderId}: id 123 → FACT-123 y estable en retry", async () => {
    vi.mocked(queryOne).mockImplementation((sql: string) => {
      if (String(sql).includes("FROM orders WHERE")) {
        return Promise.resolve({ ...orderRow, id: 123 });
      }
      if (String(sql).includes("FROM customers WHERE id")) return Promise.resolve(customerRow);
      if (String(sql).includes("SELECT * FROM invoices WHERE")) return Promise.resolve(currentInvoice);
      return Promise.resolve(null);
    });
    currentInvoice = invoiceRow({ order_id: 123, reference_code: "FACT-123" });

    createInvoiceMock.mockResolvedValue({
      data: { reference_code: "FACT-123", number: "SETP1", is_validated: true },
    } as any);

    const first = await generateInvoice(123);
    expect(first.submitted).toBe(true);
    expect(createInvoiceMock.mock.calls[0][0].reference_code).toBe("FACT-123");
    expect(first.invoice.reference_code).toBe("FACT-123");

    currentInvoice = invoiceRow({ order_id: 123, reference_code: "FACT-123", status: "failed", attempts: 1 });

    const retry = await generateInvoice(123);
    expect(retry.submitted).toBe(true);
    expect(createInvoiceMock).toHaveBeenCalledTimes(2);
    expect(createInvoiceMock.mock.calls[1][0].reference_code).toBe("FACT-123");
    expect(retry.invoice.reference_code).toBe("FACT-123");
  });

  it("segunda llamada para la misma orden NO inserta otra invoice ni reenvía si está validated", async () => {
    currentInvoice = invoiceRow({ status: "validated", number: "SETP1", is_validated: 1 });

    await generateInvoice(5);
    await generateInvoice(5);

    const inserts = vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO invoices"));
    expect(inserts).toHaveLength(0);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it("lanza ConflictError si la factura está cancelled (no reenvío automático)", async () => {
    currentInvoice = invoiceRow({ status: "cancelled" });

    await expect(generateInvoice(5)).rejects.toBeInstanceOf(ConflictError);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it("reintenta cuando la factura está failed", async () => {
    currentInvoice = invoiceRow({ status: "failed", error: JSON.stringify({ phase: "factus" }), attempts: 1 });

    createInvoiceMock.mockResolvedValue({
      data: { reference_code: "FACT-5", number: "SETP200", is_validated: true, cufe: "cufe-ok" },
    } as any);

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(true);
    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
    expect(result.invoice.attempts).toBe(2);
  });

  it("Factus exitoso: reference_code estable, customer_snapshot y estado validated persistidos", async () => {
    currentInvoice = invoiceRow() as any;

    createInvoiceMock.mockResolvedValue({
      data: {
        reference_code: "FACT-5",
        number: "SETP100",
        is_validated: true,
        validated_at: "13-05-2026 08:21:49 AM",
        cufe: "a821f2e05cb1b82e0f74",
        totals: { total: "50000.00", tax_amount: "7983.20" },
        links: { qr: "https://qr", public_url: "https://pub" },
      },
    } as any);

    const result = await generateInvoice(5);

    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
    const sentPayload = createInvoiceMock.mock.calls[0][0];
    expect(sentPayload.reference_code).toBe("FACT-5");
    expect(sentPayload.send_email).toBe(true);
    expect(sentPayload.payment_details[0].amount).toBe("50000.00");
    expect(sentPayload.items[0].price).toBe("21008.40");

    const updateCalls = vi.mocked(query).mock.calls.map(([sql]) => String(sql));
    const snapshotCall = vi.mocked(query).mock.calls.find((call) =>
      String(call[0]).includes("customer_snapshot")
    );
    expect(snapshotCall).toBeTruthy();
    const snapshotParams = (snapshotCall as unknown[])[1] as unknown[];
    const snapshot = JSON.parse(String(snapshotParams[1]));
    expect(snapshot).toEqual(sentPayload.customer);
    expect(snapshot.names).toBe("Juan Pérez");
    expect(snapshot.identification).toBe("123456789");

    const validatedUpdate = updateCalls.find((sql) => sql.includes("status = 'validated'"));
    expect(validatedUpdate).toBeTruthy();

    expect(result.submitted).toBe(true);
    expect(result.invoice.status).toBe("validated");
    expect(result.message).toContain("SETP100");
    expect(result.invoice.number).toBe("SETP100");
  });

  it("Factus falla: invoice queda failed y NO toca órdenes/stock", async () => {
    currentInvoice = invoiceRow() as any;

    createInvoiceMock.mockRejectedValue(new FactusValidationError("campo items inválido"));

    await expect(generateInvoice(5)).rejects.toBeInstanceOf(FactusValidationError);

    const updateCalls = vi.mocked(query).mock.calls.map(([sql]) => String(sql));
    expect(updateCalls.some((sql) => sql.includes("status = 'failed'"))).toBe(true);
    expect(updateCalls.some((sql) => sql.includes("UPDATE orders"))).toBe(false);
    expect(updateCalls.some((sql) => sql.includes("UPDATE products"))).toBe(false);
    expect(updateCalls.some((sql) => /inventory_movements/.test(sql))).toBe(false);
  });

  it("rechaza/bloquea cuando tax_rate es NULL (configuración pendiente)", async () => {
    vi.mocked(queryMany).mockResolvedValue([
      { ...productRows[0], tax_rate: null },
    ] as any);

    await expect(generateInvoice(5)).rejects.toThrow(/tax_rate NULL/);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it("resuelve numbering range desde env sin consultar Factus", async () => {
    currentInvoice = invoiceRow() as any;
    createInvoiceMock.mockResolvedValue({ data: { is_validated: true } } as any);

    await generateInvoice(5);

    expect(createInvoiceMock.mock.calls[0][0].numbering_range_id).toBe(389);
    expect(getNumberingRangesMock).not.toHaveBeenCalled();
  });

  it("requiere datos fiscales del cliente si la orden no tiene customer asociado", async () => {
    vi.mocked(queryOne).mockImplementation((sql: string) => {
      if (String(sql).includes("FROM orders WHERE")) {
        return Promise.resolve({ ...orderRow, customer_id: null });
      }
      return Promise.resolve(null);
    });

    await expect(generateInvoice(5)).rejects.toThrow(/datos fiscales del cliente/i);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it("usa el precio histórico de orders.items[] (nunca products.price)", async () => {
    const historicalOrder = {
      ...orderRow,
      total: 70000,
      items: JSON.stringify([{ id: 1, qty: 2, price: 35000, name: "Café Tradicional 500g", presentation: "500g" }]),
    };
    vi.mocked(queryOne).mockImplementation((sql: string) => {
      if (String(sql).includes("FROM orders WHERE")) return Promise.resolve(historicalOrder);
      if (String(sql).includes("FROM customers WHERE id")) return Promise.resolve(customerRow);
      if (String(sql).includes("SELECT * FROM invoices WHERE")) return Promise.resolve(currentInvoice);
      return Promise.resolve(null);
    });
    vi.mocked(queryMany).mockResolvedValue([
      { ...productRows[0], price: 40000 },
    ] as any);
    currentInvoice = invoiceRow() as any;

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(true);
    // 35000 @19% => base 29411.76; NO 40000 (products.price está en la BD pero no se usa)
    expect(createInvoiceMock.mock.calls[0][0].items[0].price).toBe("29411.76");
    expect(createInvoiceMock.mock.calls[0][0].items[0].quantity).toBe("2.00");
  });

  it("numbering range: usa el único rango disponible si no hay env explícito", async () => {
    delete process.env.FACTUS_NUMBERING_RANGE_ID;
    currentInvoice = invoiceRow() as any;
    getNumberingRangesMock.mockResolvedValue([{ id: 100, active: true }] as any);

    await generateInvoice(5);

    expect(createInvoiceMock.mock.calls[0][0].numbering_range_id).toBe(100);
  });

  it("numbering range: bloquea si hay varios rangos y no hay selección explícita", async () => {
    delete process.env.FACTUS_NUMBERING_RANGE_ID;
    getNumberingRangesMock.mockResolvedValue([{ id: 1 }, { id: 2 }] as any);

    await expect(generateInvoice(5)).rejects.toThrow(/varios rangos/i);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });
});