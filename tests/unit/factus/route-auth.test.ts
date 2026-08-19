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

vi.mock("@/lib/db", () => ({
  query: vi.fn(),
  queryOne: vi.fn(),
}));

vi.mock("@/lib/security/api-auth", () => ({
  requireApiAuth: vi.fn(),
}));

import { requireApiAuth } from "@/lib/security/api-auth";
import { NextRequest, NextResponse } from "next/server";
import { GET as DebugGET } from "@/app/api/debug/route";
import { GET, PUT, DELETE } from "@/app/api/admin/products/[id]/route";

const denied = (): any => NextResponse.json({ error: "No autorizado" }, { status: 401 });
const allowed = (): any => null;

async function authResponse(handler: (...args: any[]) => Promise<NextResponse>) {
  const request = new NextRequest("http://localhost/api/admin/products/1");
  return handler(request, { params: Promise.resolve({ id: "1" }) });
}

beforeEach(() => {
  vi.mocked(requireApiAuth).mockReset();
});

describe("Fase 6G - autorización: /api/debug", () => {
  it("sin sesión devuelve 401 y NO consulta la BD", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(denied());
    const res = await DebugGET(new NextRequest("http://localhost/api/debug"));
    expect(res.status).toBe(401);
  });

  it("nunca expone password_hash, aunque haya sesión", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(allowed());
    const { queryOne } = await import("@/lib/db");
    vi.mocked(queryOne).mockResolvedValue({ id: 1, username: "creencia" } as any);

    const res = await DebugGET(new NextRequest("http://localhost/api/debug"));
    expect(res.status).toBe(200);
    const payload = JSON.stringify(await res.json());
    expect(payload).not.toContain("hash");
    expect(payload).not.toContain("password");
  });
});

describe("Fase 6G - autorización: /api/admin/products/[id]", () => {
  it("GET sin sesión devuelve 401", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(denied());
    const res = await authResponse(GET);
    expect(res.status).toBe(401);
  });

  it("PUT sin sesión devuelve 401", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(denied());
    const res = await authResponse(PUT);
    expect(res.status).toBe(401);
  });

  it("DELETE sin sesión devuelve 401", async () => {
    vi.mocked(requireApiAuth).mockResolvedValue(denied());
    const res = await authResponse(DELETE);
    expect(res.status).toBe(401);
  });
});