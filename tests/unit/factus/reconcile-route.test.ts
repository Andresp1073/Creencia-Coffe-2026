import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", () => {
  class NextRequest {
    method: string;
    url: string;
    private body: string | null;
    constructor(input: string, init?: RequestInit) {
      this.method = init?.method ?? "GET";
      this.url = input;
      this.body = typeof init?.body === "string" ? (init.body as string) : null;
    }
    async json(): Promise<unknown> {
      if (!this.body) throw new Error("Solicitud sin cuerpo");
      return JSON.parse(this.body);
    }
  }
  class NextResponse {
    status: number;
    ok: boolean;
    private payload: unknown;
    constructor(payload: unknown, status: number) {
      this.payload = payload;
      this.status = status;
      this.ok = status >= 200 && status < 300;
    }
    static json(payload: unknown, init?: { status?: number }) {
      return new NextResponse(payload, init?.status ?? 200);
    }
    async json(): Promise<unknown> {
      return this.payload;
    }
  }
  return { NextRequest, NextResponse };
});

vi.mock("@/lib/security/api-auth", () => ({
  requireApiAuth: vi.fn(),
}));

vi.mock("@/lib/factus/invoice.service", () => ({
  reconcileInvoice: vi.fn(),
}));

vi.mock("@/lib/admin/invoices", () => ({
  mapInvoiceForAdmin: vi.fn(),
}));

import { requireApiAuth } from "@/lib/security/api-auth";
import { reconcileInvoice } from "@/lib/factus/invoice.service";
import { mapInvoiceForAdmin } from "@/lib/admin/invoices";
import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/admin/invoices/[orderId]/reconcile/route";

const denied = (): any => NextResponse.json({ error: "No autorizado" }, { status: 401 });
const allowed = (): any => null;

function reconcileRequest(orderId = "5") {
  return new NextRequest(`http://localhost/api/admin/invoices/${orderId}/reconcile`, {
    method: "POST",
    body: "{}",
  });
}

beforeEach(() => {
  vi.mocked(requireApiAuth).mockReset();
  vi.mocked(reconcileInvoice).mockReset();
  vi.mocked(mapInvoiceForAdmin).mockReset();
});

describe("Fase 7B - POST /api/admin/invoices/[orderId]/reconcile", () => {
  it("sin sesión devuelve 401 y NO ejecuta la reconciliación", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(denied());

    const res = await POST(reconcileRequest(), { params: { orderId: "5" } });

    expect(res.status).toBe(401);
    expect(reconcileInvoice).not.toHaveBeenCalled();
  });

  it("con sesión ejecuta la reconciliación y devuelve la factura mapeada", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(allowed());
    vi.mocked(reconcileInvoice).mockResolvedValue({
      invoice: { id: 10, status: "validated", number: "SETP990015610" } as any,
      reconciled: true,
      message: "Factura FACT-5 reconciliada y validada por Factus",
    });
    vi.mocked(mapInvoiceForAdmin).mockImplementation((row) => ({
      id: Number(row.id),
      order_id: 5,
      status: String(row.status),
      number: row.number ?? null,
      status_label: "Validada",
      status_message: "Validada por DIAN",
      attempts_label: "Intentos: 1/3",
      retriable: false,
      requires_reconciliation: false,
      cufe: null,
      is_validated: true,
    } as any));

    const res = await POST(reconcileRequest(), { params: { orderId: "5" } });
    const payload = await res.json();

    expect(res.status).toBe(200);
    expect(reconcileInvoice).toHaveBeenCalledWith(5);
    expect(payload.reconciled).toBe(true);
    expect(payload.invoice.status).toBe("validated");
    expect(payload.message).toContain("validada por Factus");
  });

  it("orderId inválido devuelve 400 y NO ejecuta la reconciliación", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(allowed());

    const res = await POST(reconcileRequest("abc"), { params: { orderId: "abc" } });

    expect(res.status).toBe(400);
    expect(reconcileInvoice).not.toHaveBeenCalled();
  });
});