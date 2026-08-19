import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { query, queryOne } from "@/lib/db";
import { getBills, createInvoice } from "@/lib/factus/factus.client";
import { reconcileInvoice } from "@/lib/factus/invoice.service";
import { getInvoiceStatusInfo } from "@/lib/admin/invoice-status";
import {
  FactusRateLimitError,
  FactusNotFoundError,
  FactusClientUnavailableError,
} from "@/lib/factus/errors";

vi.mock("@/lib/factus/factus.client", () => ({
  getBills: vi.fn(),
  getBillByNumber: vi.fn(),
  createInvoice: vi.fn(),
  getNumberingRanges: vi.fn(),
  invalidateTokenCache: vi.fn(),
  getAccessToken: vi.fn(),
}));

const getBillsMock = vi.mocked(getBills);
const createInvoiceMock = vi.mocked(createInvoice);

function invoiceRow(overrides: Record<string, unknown> = {}): any {
  return {
    id: 10,
    order_id: 5,
    customer_id: 5,
    customer_snapshot: null,
    reference_code: "FACT-5",
    status: "processing",
    number: null,
    cufe: null,
    is_validated: 0,
    validated_at: null,
    totals: null,
    links: null,
    error: null,
    attempts: 1,
    last_attempt_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

let currentInvoice: any | null;
let validatedUpdateParams: any[] | null;

function validatedUpdateCalls() {
  return vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes("status = 'validated'"));
}

beforeEach(() => {
  currentInvoice = invoiceRow();
  validatedUpdateParams = null;

  vi.mocked(query).mockClear();
  vi.mocked(queryOne).mockClear();
  getBillsMock.mockReset();
  createInvoiceMock.mockReset();

  vi.mocked(queryOne).mockImplementation(async (sql: string) => {
    const text = String(sql);
    if (text.includes("FROM invoices WHERE order_id")) return currentInvoice;
    if (text.includes("FROM invoices WHERE id")) return currentInvoice;
    return null;
  });

  vi.mocked(query).mockImplementation(async (sql: string, params?: any[]) => {
    const text = String(sql);
    if (text.includes("status = 'validated'")) {
      currentInvoice = {
        ...currentInvoice,
        status: "validated",
        is_validated: params?.[0],
        number: params?.[1],
        cufe: params?.[2],
        validated_at: params?.[3],
        totals: params?.[4],
        links: params?.[5],
        error: null,
      };
      validatedUpdateParams = params ?? null;
      return { affectedRows: 1 } as any;
    }
    return { affectedRows: 1 } as any;
  });
});

afterEach(() => {
  delete process.env.FACTUS_NUMBERING_RANGE_ID;
});

describe("Fase 7B - reconcileInvoice", () => {
  it("processing + Factus validated: actualiza la factura local a validated", async () => {
    getBillsMock.mockResolvedValue([
      { reference_code: "FACT-5", number: "SETP990015609", is_validated: true, cufe: "cufe-xyz" },
    ]);

    const result = await reconcileInvoice(5);

    expect(result.reconciled).toBe(true);
    expect(result.invoice.status).toBe("validated");
    expect(result.invoice.is_validated).toBe(1);
    expect(createdInvoiceWrites()).toHaveLength(0);
  });

  it("processing + validada: guarda el número de Factus", async () => {
    getBillsMock.mockResolvedValue([
      { reference_code: "FACT-5", number: "SETP990015609", is_validated: true, cufe: "cufe-xyz" },
    ]);

    const result = await reconcileInvoice(5);

    expect(validatedUpdateParams?.[1]).toBe("SETP990015609");
    expect(result.invoice.number).toBe("SETP990015609");
  });

  it("processing + validada: guarda el CUFE de Factus", async () => {
    getBillsMock.mockResolvedValue([
      { reference_code: "FACT-5", number: "SETP990015609", is_validated: true, cufe: "2d52fb6c..." },
    ]);

    const result = await reconcileInvoice(5);

    expect(validatedUpdateParams?.[2]).toBe("2d52fb6c...");
    expect(result.invoice.cufe).toBe("2d52fb6c...");
  });

  it("processing + validada: normaliza validated_at (DD-MM-YYYY hh:mm:ss AM/PM -> MySQL)", async () => {
    getBillsMock.mockResolvedValue([
      { reference_code: "FACT-5", number: "SETP990015609", is_validated: true, validated_at: "18-08-2026 01:34:36 PM" },
    ]);

    const result = await reconcileInvoice(5);

    expect(validatedUpdateParams?.[3]).toBe("2026-08-18 13:34:36");
    expect(result.invoice.validated_at).toBe("2026-08-18 13:34:36");
  });

  it("processing + factura aún pendiente en Factus: permanece processing y NO actualiza", async () => {
    getBillsMock.mockResolvedValue([
      { reference_code: "FACT-5", is_validated: false },
    ]);

    const result = await reconcileInvoice(5);

    expect(result.reconciled).toBe(false);
    expect(result.invoice.status).toBe("processing");
    expect(validatedUpdateCalls()).toHaveLength(0);
    expect(result.message).toMatch(/pendiente/);
  });

  it("processing + factura no encontrada (array vacío): permanece processing y pide revisión manual", async () => {
    getBillsMock.mockResolvedValue([]);

    const result = await reconcileInvoice(5);

    expect(result.reconciled).toBe(false);
    expect(result.invoice.status).toBe("processing");
    expect(validatedUpdateCalls()).toHaveLength(0);
    expect(result.message).toMatch(/manual/);
  });

  it("processing + múltiples resultados: NO actualiza, NO elige ninguno y exige revisión manual", async () => {
    getBillsMock.mockResolvedValue([
      { reference_code: "FACT-5", number: "SETP-A", is_validated: true, cufe: "cufe-a" },
      { reference_code: "FACT-5", number: "SETP-B", is_validated: true, cufe: "cufe-b" },
    ]);

    const result = await reconcileInvoice(5);

    expect(result.reconciled).toBe(false);
    expect(result.invoice.status).toBe("processing");
    expect(validatedUpdateCalls()).toHaveLength(0);
    expect(result.message).toMatch(/revisión manual|manual/);
    expect(result.message).not.toMatch(/(cufe-.+)/);
  });

  it("múltiples resultados: NO ejecuta createInvoice ni POST /v2/bills/validate", async () => {
    getBillsMock.mockResolvedValue([
      { reference_code: "FACT-5", number: "SETP-A", is_validated: true },
      { reference_code: "FACT-5", number: "SETP-B", is_validated: true },
    ]);

    await reconcileInvoice(5);

    expect(createInvoiceMock).not.toHaveBeenCalled();
    expect(getBillsMock).toHaveBeenCalledTimes(1);
    expect(validatedUpdateCalls()).toHaveLength(0);
  });

  it("processing + 404: propaga FactusNotFoundError y NO modifica el estado", async () => {
    getBillsMock.mockRejectedValue(new FactusNotFoundError("No existe"));

    await expect(reconcileInvoice(5)).rejects.toBeInstanceOf(FactusNotFoundError);
    expect(currentInvoice.status).toBe("processing");
    expect(validatedUpdateCalls()).toHaveLength(0);
  });

  it("processing + 429: propaga FactusRateLimitError y NO modifica el estado", async () => {
    getBillsMock.mockRejectedValue(new FactusRateLimitError("Rate limit", 30));

    await expect(reconcileInvoice(5)).rejects.toBeInstanceOf(FactusRateLimitError);
    expect(currentInvoice.status).toBe("processing");
    expect(validatedUpdateCalls()).toHaveLength(0);
  });

  it("processing + timeout: propaga FactusClientUnavailableError y NO modifica el estado", async () => {
    getBillsMock.mockRejectedValue(new FactusClientUnavailableError("timeout"));

    await expect(reconcileInvoice(5)).rejects.toBeInstanceOf(FactusClientUnavailableError);
    expect(currentInvoice.status).toBe("processing");
    expect(validatedUpdateCalls()).toHaveLength(0);
  });

  it("processing + 5xx: propaga FactusClientUnavailableError y NO modifica el estado", async () => {
    getBillsMock.mockRejectedValue(new FactusClientUnavailableError("Factus 503"));

    await expect(reconcileInvoice(5)).rejects.toBeInstanceOf(FactusClientUnavailableError);
    expect(currentInvoice.status).toBe("processing");
    expect(validatedUpdateCalls()).toHaveLength(0);
  });

  it.each(["pending", "failed", "validated", "cancelled"])(
    "estado %s: devuelve respuesta segura y NO llama a Factus",
    async (status) => {
      currentInvoice = invoiceRow({ status });

      const result = await reconcileInvoice(5);

      expect(result.reconciled).toBe(false);
      expect(getBillsMock).not.toHaveBeenCalled();
      expect(createInvoiceMock).not.toHaveBeenCalled();
      expect(validatedUpdateCalls()).toHaveLength(0);
      expect(currentInvoice.status).toBe(status);
    }
  );

  it("concurrencia: dos reconciliaciones simultáneas consultan (GET) y no emiten ni corrompen estado", async () => {
    getBillsMock.mockResolvedValue([
      { reference_code: "FACT-5", number: "SETP-CONC", is_validated: true, cufe: "cufe-conc" },
    ]);

    const [a, b] = await Promise.all([reconcileInvoice(5), reconcileInvoice(5)]);

    expect(getBillsMock).toHaveBeenCalledTimes(2);
    expect(createInvoiceMock).not.toHaveBeenCalled();
    expect(a.reconciled).toBe(true);
    expect(b.reconciled).toBe(true);
    expect(a.invoice.status).toBe("validated");
    expect(b.invoice.status).toBe("validated");
  });

  it("NUNCA invoca createInvoice / sendInvoiceToFactus durante la reconciliación", async () => {
    getBillsMock.mockResolvedValue([
      { reference_code: "FACT-5", number: "SETP-X", is_validated: true, cufe: "cufe-x" },
    ]);

    await reconcileInvoice(5);

    expect(createInvoiceMock).not.toHaveBeenCalled();
  });
});

describe("Fase 7B - UI/backend: processing habilita reconciliación, no retry", () => {
  it("processing -> requires_reconciliation=true y retriable=false", () => {
    const info = getInvoiceStatusInfo("processing", 1);
    expect(info.requiresReconciliation).toBe(true);
    expect(info.retriable).toBe(false);
  });

  it("failed 2/3 -> retriable=true y requires_reconciliation=false", () => {
    const info = getInvoiceStatusInfo("failed", 2);
    expect(info.retriable).toBe(true);
    expect(info.requiresReconciliation).toBe(false);
  });
});

function createdInvoiceWrites() {
  return vi.mocked(query).mock.calls.filter(([sql]) => String(sql).includes("INSERT INTO invoices"));
}