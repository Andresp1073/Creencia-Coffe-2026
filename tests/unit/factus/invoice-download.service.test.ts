import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryOne } from "@/lib/db";
import { getInvoicePdf, getInvoiceXml } from "@/lib/factus/factus.client";
import { getValidatedInvoiceFile } from "@/lib/factus/invoice.service";
import { NotFoundError, ConflictError } from "@/lib/security/safe-error";
import { FactusNotFoundError } from "@/lib/factus/errors";

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
  queryMany: vi.fn(),
}));

vi.mock("@/lib/factus/factus.client", () => ({
  createInvoice: vi.fn(),
  getNumberingRanges: vi.fn(),
  getBills: vi.fn(),
  getInvoicePdf: vi.fn(),
  getInvoiceXml: vi.fn(),
  invalidateTokenCache: vi.fn(),
  getAccessToken: vi.fn(),
}));

const queryOneMock = vi.mocked(queryOne);
const getInvoicePdfMock = vi.mocked(getInvoicePdf);
const getInvoiceXmlMock = vi.mocked(getInvoiceXml);

function invoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 10,
    order_id: 5,
    customer_id: 5,
    customer_snapshot: null,
    reference_code: "FACT-5",
    status: "validated",
    number: "SETP990015609",
    cufe: "cufe-1",
    is_validated: 1,
    validated_at: "2026-08-18 01:34:36",
    totals: null,
    links: null,
    error: null,
    attempts: 1,
    last_attempt_at: null,
    created_at: "2026-08-18 01:00:00",
    updated_at: "2026-08-18 01:34:36",
    ...overrides,
  };
}

beforeEach(() => {
  vi.mocked(queryOne).mockReset();
  vi.mocked(getInvoicePdf).mockReset();
  vi.mocked(getInvoiceXml).mockReset();
});

describe("factus.invoice.service.getValidatedInvoiceFile", () => {
  it("factura validated con number: descarga PDF de Factus (kind pdf)", async () => {
    queryOneMock.mockResolvedValue(invoiceRow());
    getInvoicePdfMock.mockResolvedValue({ file_name: "fv1", base64: "JVBERi0x" });

    const result = await getValidatedInvoiceFile(5, "pdf");

    expect(queryOneMock).toHaveBeenCalled();
    expect(getInvoicePdfMock).toHaveBeenCalledWith("SETP990015609");
    expect(getInvoiceXmlMock).not.toHaveBeenCalled();
    expect(result.invoice.number).toBe("SETP990015609");
    expect(result.file.file_name).toBe("fv1");
    expect(result.file.base64).toBe("JVBERi0x");
  });

  it("factura validated con number: descarga XML de Factus (kind xml)", async () => {
    queryOneMock.mockResolvedValue(invoiceRow());
    getInvoiceXmlMock.mockResolvedValue({ file_name: "fv1", base64: "PD94bWw" });

    const result = await getValidatedInvoiceFile(5, "xml");

    expect(getInvoiceXmlMock).toHaveBeenCalledWith("SETP990015609");
    expect(getInvoicePdfMock).not.toHaveBeenCalled();
    expect(result.file.base64).toBe("PD94bWw");
  });

  it("factura NO validated: ConflictError y NUNCA consulta Factus", async () => {
    queryOneMock.mockResolvedValue(invoiceRow({ status: "processing", number: null }));

    await expect(getValidatedInvoiceFile(5, "pdf")).rejects.toBeInstanceOf(ConflictError);
    expect(getInvoicePdfMock).not.toHaveBeenCalled();
    expect(getInvoiceXmlMock).not.toHaveBeenCalled();
  });

  it("factura validated sin number DIAN: ConflictError y NUNCA consulta Factus", async () => {
    queryOneMock.mockResolvedValue(invoiceRow({ number: null }));

    await expect(getValidatedInvoiceFile(5, "pdf")).rejects.toBeInstanceOf(ConflictError);
    expect(getInvoicePdfMock).not.toHaveBeenCalled();
    expect(getInvoiceXmlMock).not.toHaveBeenCalled();
  });

  it("no existe factura local: NotFoundError", async () => {
    queryOneMock.mockResolvedValue(null);

    await expect(getValidatedInvoiceFile(5, "pdf")).rejects.toBeInstanceOf(NotFoundError);
    expect(getInvoicePdfMock).not.toHaveBeenCalled();
  });

  it("propaga el error de la API de descarga (p. ej. FactusNotFoundError)", async () => {
    queryOneMock.mockResolvedValue(invoiceRow());
    getInvoiceXmlMock.mockRejectedValue(new FactusNotFoundError("factura no existe"));

    await expect(getValidatedInvoiceFile(5, "xml")).rejects.toBeInstanceOf(FactusNotFoundError);
  });
});