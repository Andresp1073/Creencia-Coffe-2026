import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/server", () => {
  class NextResponse {
    status: number;
    ok: boolean;
    private payload: unknown;
    constructor(payload: unknown, init?: { status?: number }) {
      this.payload = payload;
      this.status = init?.status ?? 200;
      this.ok = this.status >= 200 && this.status < 300;
    }
    static json(payload: unknown, init?: { status?: number }): NextResponse {
      return new NextResponse(payload, init);
    }
    async json(): Promise<unknown> {
      return this.payload;
    }
  }
  return { NextRequest: class {}, NextResponse };
});

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
  createToken: vi.fn(),
  setSessionCookie: vi.fn(),
}));

import { getSession, createToken, setSessionCookie } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import { POST } from "@/app/api/auth/extend/route";

beforeEach(() => {
  vi.mocked(getSession).mockReset();
  vi.mocked(createToken).mockReset();
  vi.mocked(setSessionCookie).mockReset();
});

describe("Fase 8 - POST /api/auth/extend", () => {
  it("sesión válida: re-emite el JWT (200) y renueva la cookie", async () => {
    vi.mocked(getSession).mockResolvedValue({
      userId: 1,
      username: "admin",
      email: "admin@cafecreencia.com",
      iat: 100,
      exp: 1000,
    });
    vi.mocked(createToken).mockResolvedValue("nuevo-token-fresco");

    const res = await POST();

    expect(res.status).toBe(200);
    expect(createToken).toHaveBeenCalledWith({
      userId: 1,
      username: "admin",
      email: "admin@cafecreencia.com",
    });
    expect(setSessionCookie).toHaveBeenCalledWith(expect.anything(), "nuevo-token-fresco");
  });

  it("sin sesión: devuelve 401 y NO crea token", async () => {
    vi.mocked(getSession).mockResolvedValue(null);

    const res = await POST();

    expect(res.status).toBe(401);
    expect(createToken).not.toHaveBeenCalled();
    expect(setSessionCookie).not.toHaveBeenCalled();
  });

  it("getSession lanza error: devuelve 401 seguro", async () => {
    vi.mocked(getSession).mockRejectedValue(new Error("boom"));

    const res = await POST();

    expect(res.status).toBe(401);
    expect(createToken).not.toHaveBeenCalled();
  });
});