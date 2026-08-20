import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", () => {
  class NextRequest {
    method: string;
    url: string;
    constructor(input: string, init?: RequestInit) {
      this.method = init?.method ?? "GET";
      this.url = input;
    }
  }
  class NextResponse {
    status: number;
    ok: boolean;
    private payload: unknown;
    constructor(payload: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      this.payload = payload;
      this.status = init?.status ?? 200;
      this.ok = this.status >= 200 && this.status < 300;
      this.headers = init?.headers ?? {};
    }
    static json(payload: unknown, init?: { status?: number }): NextResponse {
      return new NextResponse(payload, init);
    }
    async json(): Promise<unknown> {
      if (this.payload instanceof Uint8Array) throw new Error("no es JSON");
      return this.payload;
    }
    headers: Record<string, string>;
  }
  return { NextRequest, NextResponse };
});

vi.mock("@/lib/security/api-auth", () => ({
  requireApiAuth: vi.fn(),
}));

vi.mock("@/lib/factus/invoice.service", () => ({
  getValidatedInvoiceFile: vi.fn(),
}));

import { requireApiAuth } from "@/lib/security/api-auth";
import { getValidatedInvoiceFile } from "@/lib/factus/invoice.service";
import { ConflictError } from "@/lib/security/safe-error";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "@/app/api/admin/invoices/[orderId]/download/route";

const denied = (): any => NextResponse.json({ error: "No autorizado" }, { status: 401 });
const allowed = (): any => null;

function downloadRequest(orderId = "5", kind = "pdf") {
  return new NextRequest(`http://localhost/api/admin/invoices/${orderId}/download?kind=${kind}`);
}

const PDF_B64 = Buffer.from("%PDF-1.4 factura de prueba").toString("base64");

const VALIDATED_INVOICE = {
  id: 10,
  order_id: 5,
  reference_code: "FACT-5",
  status: "validated",
  number: "SETP990015609",
  cufe: "cufe-1",
} as any;

beforeEach(() => {
  vi.mocked(requireApiAuth).mockReset();
  vi.mocked(getValidatedInvoiceFile).mockReset();
});

describe("Fase 7I - GET /api/admin/invoices/[orderId]/download", () => {
  it("sin sesión devuelve 401 y NO ejecuta la descarga", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(denied());

    const res = await GET(downloadRequest(), { params: { orderId: "5" } });

    expect(res.status).toBe(401);
    expect(getValidatedInvoiceFile).not.toHaveBeenCalled();
  });

  it("orderId inválido devuelve 400 y NO ejecuta la descarga", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(allowed());

    const res = await GET(downloadRequest("abc"), { params: { orderId: "abc" } });

    expect(res.status).toBe(400);
    expect(getValidatedInvoiceFile).not.toHaveBeenCalled();
  });

  it("kind inválido devuelve 400 y NO ejecuta la descarga", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(allowed());

    const res = await GET(downloadRequest("5", "docx"), { params: { orderId: "5" } });

    expect(res.status).toBe(400);
    expect(getValidatedInvoiceFile).not.toHaveBeenCalled();
  });

  it("descarga PDF: devuelve el archivo binario con Content-Disposition", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(allowed());
    vi.mocked(getValidatedInvoiceFile).mockResolvedValue({
      invoice: VALIDATED_INVOICE,
      file: { file_name: "fv10007890020002600015934", base64: PDF_B64 },
    });

    const res = await GET(downloadRequest("5", "pdf"), { params: { orderId: "5" } });
    const headers = res.headers as unknown as Record<string, string>;

    expect(res.status).toBe(200);
    expect(headers["Content-Type"]).toBe("application/pdf");
    expect(headers["Content-Disposition"]).toContain("attachment");
    expect(headers["Content-Disposition"]).toContain(".pdf");
    expect(getValidatedInvoiceFile).toHaveBeenCalledWith(5, "pdf");
  });

  it("descarga XML: devuelve content-type application/xml", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(allowed());
    vi.mocked(getValidatedInvoiceFile).mockResolvedValue({
      invoice: VALIDATED_INVOICE,
      file: { file_name: "fv10007890020002600015934", base64: Buffer.from("<?xml?><factura/>").toString("base64") },
    });

    const res = await GET(downloadRequest("5", "xml"), { params: { orderId: "5" } });
    const headers = res.headers as unknown as Record<string, string>;

    expect(res.status).toBe(200);
    expect(headers["Content-Type"]).toBe("application/xml");
    expect(getValidatedInvoiceFile).toHaveBeenCalledWith(5, "xml");
  });

  it("factura no validada: devuelve 409 con mensaje seguro", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(allowed());
    vi.mocked(getValidatedInvoiceFile).mockRejectedValue(
      new ConflictError("La factura FACT-5 está en estado processing; la descarga solo está disponible para facturas validadas.")
    );

    const res = await GET(downloadRequest("5", "pdf"), { params: { orderId: "5" } });
    const payload = await res.json();

    expect(res.status).toBe(409);
    expect(payload.error).toContain("solo está disponible para facturas validadas");
  });
});
