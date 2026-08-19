import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query, queryOne, queryMany } from "@/lib/db";
import { createInvoice, getNumberingRanges } from "@/lib/factus/factus.client";
import { generateInvoice } from "@/lib/factus/invoice.service";
import { NotFoundError, ConflictError } from "@/lib/security/safe-error";
import { FactusValidationError, FactusNotFoundError } from "@/lib/factus/errors";
import { MAX_INVOICE_SEND_ATTEMPTS } from "@/lib/factus/invoice.service";

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
        attempts: (currentInvoice.attempts || 0) + 1,
      };
      return { affectedRows: 1 } as any;
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

describe("Fase 4B - vencimiento de crédito (payment_due_date)", () => {
  it("crédito sin due_date: bloquea antes de llamar Factus y NO toca órdenes/stock", async () => {
    vi.mocked(queryOne).mockImplementation((sql: string) => {
      if (String(sql).includes("FROM orders WHERE")) {
        return Promise.resolve({ ...orderRow, payment_form: "2", payment_due_date: null });
      }
      return Promise.resolve(null);
    });

    await expect(generateInvoice(5)).rejects.toThrow(/payment_due_date/i);

    expect(createInvoiceMock).not.toHaveBeenCalled();
    const updateCalls = vi.mocked(query).mock.calls.map(([sql]) => String(sql));
    expect(updateCalls.some((sql) => sql.includes("UPDATE orders"))).toBe(false);
    expect(updateCalls.some((sql) => sql.includes("UPDATE products"))).toBe(false);
    expect(updateCalls.some((sql) => /inventory_movements/.test(sql))).toBe(false);
  });

  it("crédito con due_date de la orden: lo envía en payment_details", async () => {
    vi.mocked(queryOne).mockImplementation((sql: string) => {
      if (String(sql).includes("FROM orders WHERE")) {
        return Promise.resolve({ ...orderRow, payment_form: "2", payment_due_date: "2026-06-30" });
      }
      if (String(sql).includes("FROM customers WHERE id")) return Promise.resolve(customerRow);
      if (String(sql).includes("SELECT * FROM invoices WHERE")) return Promise.resolve(currentInvoice);
      return Promise.resolve(null);
    });
    currentInvoice = invoiceRow() as any;

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(true);
    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
    expect(createInvoiceMock.mock.calls[0][0].payment_details[0]).toEqual({
      payment_form: "2",
      payment_method_code: "10",
      amount: "50000.00",
      due_date: "2026-06-30",
    });
  });

  it("crédito con due_date desde el request cuando la orden no lo tiene", async () => {
    vi.mocked(queryOne).mockImplementation((sql: string) => {
      if (String(sql).includes("FROM orders WHERE")) {
        return Promise.resolve({ ...orderRow, payment_form: null, payment_method_code: null });
      }
      if (String(sql).includes("FROM customers WHERE id")) return Promise.resolve(customerRow);
      if (String(sql).includes("SELECT * FROM invoices WHERE")) return Promise.resolve(currentInvoice);
      return Promise.resolve(null);
    });
    currentInvoice = invoiceRow() as any;

    const result = await generateInvoice(5, {
      payment: { payment_form: "2", payment_method_code: "10", payment_due_date: "2026-08-01" },
    });

    expect(result.submitted).toBe(true);
    expect(createInvoiceMock.mock.calls[0][0].payment_details[0].due_date).toBe("2026-08-01");
  });

  it("contado sin due_date: factura normal sin due_date en el payload", async () => {
    currentInvoice = invoiceRow() as any;

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(true);
    expect(createInvoiceMock.mock.calls[0][0].payment_details[0]).toEqual({
      payment_form: "1",
      payment_method_code: "10",
      amount: "50000.00",
    });
  });
});

describe("Fase 4B - validación fiscal de productos y clientes", () => {
  it("producto sin code_reference: bloquea la factura", async () => {
    vi.mocked(queryMany).mockResolvedValue([
      { ...productRows[0], code_reference: null },
    ] as any);

    await expect(generateInvoice(5)).rejects.toThrow(/code_reference/);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it("cliente jurídico: company + dv viajan en el payload y snapshot exacto", async () => {
    const juridicalRow = {
      id: 20,
      identification_document_code: "31",
      identification: "901234567",
      dv: "5",
      legal_organization_code: "1",
      tribute_code: "ZZ",
      responsibilities: '["R-99-PN"]',
      company: "Alan Company SAS",
      trade_name: "Alan",
      names: null,
      address: null,
      email: "alan@email.com",
      phone: null,
      country_code: "CO",
      municipality_code: null,
    };
    vi.mocked(queryOne).mockImplementation((sql: string) => {
      const text = String(sql);
      if (text.includes("FROM orders WHERE")) {
        return Promise.resolve({ ...orderRow, customer_id: null });
      }
      if (text.includes("FROM customers WHERE identification")) return Promise.resolve(null);
      if (text.includes("FROM customers WHERE id")) return Promise.resolve(juridicalRow);
      if (text.includes("SELECT * FROM invoices WHERE")) return Promise.resolve(currentInvoice);
      return Promise.resolve(null);
    });
    currentInvoice = invoiceRow() as any;

    const result = await generateInvoice(5, {
      customer: {
        identification_document_code: "31",
        identification: "901234567",
        dv: "5",
        legal_organization_code: "1",
        company: "Alan Company SAS",
        email: "alan@email.com",
      },
    });

    expect(result.submitted).toBe(true);
    const sent = createInvoiceMock.mock.calls[0][0];
    expect(sent.customer.legal_organization_code).toBe("1");
    expect(sent.customer.company).toBe("Alan Company SAS");
    expect(sent.customer.dv).toBe("5");
    expect(sent.customer).not.toHaveProperty("names");

    const snapshotCall = vi.mocked(query).mock.calls.find((call) =>
      String(call[0]).includes("customer_snapshot")
    );
    expect(snapshotCall).toBeTruthy();
    const snapshotParams = (snapshotCall as unknown[])[1] as unknown[];
    const snapshot = JSON.parse(String(snapshotParams[1]));
    expect(snapshot).toEqual(sent.customer);
  });
});

describe("F2 - reclamación atómica (race condition)", () => {
  function atomicMock(opts: {
    initialStatus?: string;
    initialAttempts?: number;
    onClaim?: (affectedRows: number, attempts: number) => void;
  }) {
    currentInvoice = invoiceRow({
      status: opts.initialStatus ?? "pending",
      attempts: opts.initialAttempts ?? 0,
    });

    let claimCount = 0;

    vi.mocked(query).mockImplementation(async (sql: string, params?: any[]) => {
      const text = String(sql);
      if (text.includes("INSERT INTO invoices")) {
        throw new Error("no debería insertarse: la invoice ya existe");
      }
      if (text.includes("status = 'processing'")) {
        claimCount += 1;
        if (claimCount === 1) {
          currentInvoice = {
            ...currentInvoice,
            status: "processing",
            customer_id: params?.[0],
            customer_snapshot: params?.[1],
            attempts: (currentInvoice.attempts || 0) + 1,
          };
          opts.onClaim?.(1, currentInvoice.attempts);
          return { affectedRows: 1 } as any;
        }
        opts.onClaim?.(0, currentInvoice.attempts);
        return { affectedRows: 0 } as any;
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
        return { affectedRows: 1 } as any;
      }
      if (text.includes("status = 'failed'")) {
        currentInvoice = { ...currentInvoice, status: "failed", attempts: params?.[0], error: params?.[1] };
        return { affectedRows: 1 } as any;
      }
      return { affectedRows: 1 } as any;
    });
  }

  it("pending + una llamada: Factus se llama UNA vez y attempts avanza de 0 a 1", async () => {
    atomicMock({ initialStatus: "pending", initialAttempts: 0 });

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(true);
    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
    expect(result.invoice.status).toBe("validated");
    expect(result.invoice.attempts).toBe(1);
  });

  it("failed + retry: Factus se llama UNA vez y attempts avanza de 1 a 2", async () => {
    atomicMock({ initialStatus: "failed", initialAttempts: 1 });

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(true);
    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
    expect(result.invoice.status).toBe("validated");
    expect(result.invoice.attempts).toBe(2);
  });

  it("validated: Factus se llama 0 veces y no hay reclamación", async () => {
    atomicMock({ initialStatus: "validated", initialAttempts: 2 });

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(false);
    expect(result.message).toContain("ya está validada");
    expect(createInvoiceMock).not.toHaveBeenCalled();
    const claims = vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes("status = 'processing'"));
    expect(claims).toHaveLength(0);
  });

  it("processing: Factus se llama 0 veces y pide reconciliación", async () => {
    atomicMock({ initialStatus: "processing", initialAttempts: 1 });

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(false);
    expect(result.message).toMatch(/reconciliaci/i);
    expect(createInvoiceMock).not.toHaveBeenCalled();
    const claims = vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes("status = 'processing'"));
    expect(claims).toHaveLength(0);
  });

  it("cancelled: Factus se llama 0 veces y lanza ConflictError", async () => {
    atomicMock({ initialStatus: "cancelled", initialAttempts: 0 });

    await expect(generateInvoice(5)).rejects.toBeInstanceOf(ConflictError);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it("dos llamadas concurrentes sobre pending: Factus se llama EXACTAMENTE 1 vez", async () => {
    const claimResults: number[] = [];
    atomicMock({
      initialStatus: "pending",
      initialAttempts: 0,
      onClaim: (affectedRows) => claimResults.push(affectedRows),
    });

    createInvoiceMock.mockResolvedValue({
      data: { reference_code: "FACT-5", number: "SETP-CC", is_validated: true },
    } as any);

    const [a, b] = await Promise.all([generateInvoice(5), generateInvoice(5)]);

    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
    expect(claimResults).toHaveLength(2);
    expect(claimResults.filter((r) => r === 1)).toHaveLength(1);
    expect(claimResults.filter((r) => r === 0)).toHaveLength(1);
    expect(a.submitted ? a.submitted !== b.submitted : b.submitted).toBe(true);
    expect(a.invoice.reference_code).toBe("FACT-5");
    expect(b.invoice.reference_code).toBe("FACT-5");
    expect(a.invoice.attempts).toBe(1);
    expect(b.invoice.attempts).toBe(1);
    expect(createInvoiceMock.mock.calls[0][0].reference_code).toBe("FACT-5");
  });

  it("dos llamadas concurrentes sobre failed: Factus se llama EXACTAMENTE 1 vez", async () => {
    const claimResults: number[] = [];
    atomicMock({
      initialStatus: "failed",
      initialAttempts: 1,
      onClaim: (affectedRows) => claimResults.push(affectedRows),
    });

    createInvoiceMock.mockResolvedValue({
      data: { reference_code: "FACT-5", number: "SETP-CC-2", is_validated: true },
    } as any);

    const [a, b] = await Promise.all([generateInvoice(5), generateInvoice(5)]);

    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
    expect(claimResults).toHaveLength(2);
    const winner = claimResults.findIndex((r) => r === 1);
    expect(winner).toBeGreaterThanOrEqual(0);
    const loser = winner === 0 ? 1 : 0;
    expect(claimResults[loser]).toBe(0);
    expect(a.invoice.attempts).toBe(2);
    expect(b.invoice.attempts).toBe(2);
  });

  it("segunda llamada tras una reclamación ganada NO incrementa attempts ni reenvía", async () => {
    const claimResults: number[] = [];
    atomicMock({
      initialStatus: "pending",
      initialAttempts: 0,
      onClaim: (affectedRows) => claimResults.push(affectedRows),
    });

    createInvoiceMock.mockResolvedValue({
      data: { reference_code: "FACT-5", number: "SETP-SEQ", is_validated: true },
    } as any);

    const first = await generateInvoice(5);
    const second = await generateInvoice(5);

    expect(first.submitted).toBe(true);
    expect(first.invoice.status).toBe("validated");
    expect(first.invoice.attempts).toBe(1);

    expect(second.submitted).toBe(false);
    expect(second.invoice.status).toBe("validated");
    expect(second.invoice.attempts).toBe(1);

    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
    expect(claimResults).toEqual([1]);
  });
});

describe("Fase 6E - propagación del 404 de numbering range y límite de reintentos", () => {
  it("getNumberingRanges 404 → FactusNotFoundError propagado sin convertir ni retry", async () => {
    delete process.env.FACTUS_NUMBERING_RANGE_ID;
    currentInvoice = invoiceRow() as any;

    const rangeError = new FactusNotFoundError("El rango de numeración no existe");
    getNumberingRangesMock.mockRejectedValue(rangeError);

    const error = await generateInvoice(5).catch((e) => e);

    expect(error).toBeInstanceOf(FactusNotFoundError);
    expect(error).toBe(rangeError);
    expect(error.statusCode).toBe(404);
    expect(createInvoiceMock).not.toHaveBeenCalled();
    const claims = vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes("status = 'processing'"));
    expect(claims).toHaveLength(0);
  });

  it("failed con attempts justo bajo el límite: reintentable y alcanza el tope", async () => {
    currentInvoice = invoiceRow({ status: "failed", attempts: MAX_INVOICE_SEND_ATTEMPTS - 1 });
    createInvoiceMock.mockResolvedValue({
      data: { reference_code: "FACT-5", number: "SETP-L2", is_validated: true },
    } as any);

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(true);
    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
    expect(result.invoice.attempts).toBe(MAX_INVOICE_SEND_ATTEMPTS);
  });

  it("failed con attempts al límite: bloqueada, NO llama a Factus ni hace claim", async () => {
    currentInvoice = invoiceRow({
      status: "failed",
      attempts: MAX_INVOICE_SEND_ATTEMPTS,
      error: JSON.stringify({ phase: "factus", message: "rechazo" }),
    });

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(false);
    expect(result.invoice.status).toBe("failed");
    expect(createInvoiceMock).not.toHaveBeenCalled();
    expect(result.message).toMatch(/límite/i);
    const claims = vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes("status = 'processing'"));
    expect(claims).toHaveLength(0);
  });

  it("failed con attempts por encima del límite: bloqueada sin importar intentos extra", async () => {
    currentInvoice = invoiceRow({ status: "failed", attempts: MAX_INVOICE_SEND_ATTEMPTS + 1 });

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(false);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });

  it("pending con attempts 0 conserva el flujo: el límite NO aplica a pending", async () => {
    currentInvoice = invoiceRow({ status: "pending", attempts: 0 });

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(true);
    expect(createInvoiceMock).toHaveBeenCalledTimes(1);
    expect(result.invoice.attempts).toBe(1);
  });
});

describe("Fase 6G - auditoría final (concurrencia, attempts, stock, snapshot)", () => {
  function claims() {
    return vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes("status = 'processing'"));
  }
  function stockWrites() {
    return vi.mocked(query).mock.calls.filter(([sql]) =>
      /UPDATE products|inventory_movements|UPDATE orders/i.test(String(sql))
    );
  }

  it("validated en dos POST concurrentes: 0 llamadas a Factus y 0 claims", async () => {
    currentInvoice = invoiceRow({ status: "validated", number: "SETP-DUP", is_validated: 1, attempts: 2 });

    const [a, b] = await Promise.all([generateInvoice(5), generateInvoice(5)]);

    expect(createInvoiceMock).not.toHaveBeenCalled();
    expect(claims()).toHaveLength(0);
    expect(a.submitted).toBe(false);
    expect(b.submitted).toBe(false);
    expect(a.invoice.attempts).toBe(2);
    expect(b.invoice.attempts).toBe(2);
  });

  it("processing en dos POST concurrentes: 0 llamadas a Factus, ambas piden reconciliación", async () => {
    currentInvoice = invoiceRow({ status: "processing", attempts: 1 });

    const [a, b] = await Promise.all([generateInvoice(5), generateInvoice(5)]);

    expect(createInvoiceMock).not.toHaveBeenCalled();
    expect(claims()).toHaveLength(0);
    expect(a.message).toMatch(/reconciliaci/i);
    expect(b.message).toMatch(/reconciliaci/i);
    expect(a.invoice.attempts).toBe(1);
    expect(b.invoice.attempts).toBe(1);
  });

  it("attempts no puede manipularse desde el request: los sobrantes del body se ignoran", async () => {
    currentInvoice = invoiceRow({ status: "pending", attempts: 0 });

    const result = await generateInvoice(5, {
      hints: { attempts: 999 },
      attempts: 999,
      reset: true,
    } as any);

    expect(result.invoice.attempts).toBe(1);
    const claimsWithBig = claims();
    expect(claimsWithBig).toHaveLength(1);
    expect(Array.from(new Set(claimsWithBig.flatMap((c) => (c[1] as unknown[]).map(String))))).not.toContain("999");
  });

  it("facturar con éxito NO descuenta stock ni registra movimientos", async () => {
    currentInvoice = invoiceRow() as any;
    createInvoiceMock.mockResolvedValue({
      data: { reference_code: "FACT-5", number: "SETP-STOCK", is_validated: true },
    } as any);

    const result = await generateInvoice(5);

    expect(result.submitted).toBe(true);
    expect(stockWrites()).toHaveLength(0);
  });

  it("la factura fallida NO descuenta stock ni registra movimientos al reintentar", async () => {
    currentInvoice = invoiceRow({ status: "failed", attempts: 2 });
    createInvoiceMock.mockRejectedValue(new FactusValidationError("rechazada de nuevo"));

    await expect(generateInvoice(5)).rejects.toBeInstanceOf(FactusValidationError);
    expect(stockWrites()).toHaveLength(0);
  });

  it("snapshot inmutable: un POST sobre validated NO reescribe customer_snapshot", async () => {
    currentInvoice = invoiceRow({
      status: "validated",
      number: "SETP-IMMUT",
      is_validated: 1,
      customer_snapshot: JSON.stringify({ names: "Snapshot Original" }),
      attempts: 1,
    });

    await generateInvoice(5);

    const snapshotWrites = vi.mocked(query).mock.calls.filter(
      ([sql]) => String(sql).includes("customer_snapshot")
    );
    expect(snapshotWrites).toHaveLength(0);
    expect(createInvoiceMock).not.toHaveBeenCalled();
  });
});