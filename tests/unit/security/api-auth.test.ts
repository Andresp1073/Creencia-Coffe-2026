import { describe, it, expect, vi, beforeEach } from "vitest";
import { resetRateLimits } from "@/lib/security/rate-limit";

vi.mock("next/server", () => {
  class NextRequest {
    nextUrl: { pathname: string; host: string };
    headers: Map<string, string>;
    cookies: { get: () => { value?: string } | undefined };
    constructor(input: string, init?: { headers?: Record<string, string>; cookie?: string }) {
      const u = new URL(input);
      this.nextUrl = { pathname: u.pathname, host: u.host };
      this.headers = new Map(Object.entries(init?.headers ?? {}));
      this.cookies = { get: () => (init?.cookie ? { value: init.cookie } : undefined) };
    }
  }
  class NextResponse {
    status: number;
    constructor(status: number) {
      this.status = status;
    }
    static json(_payload: unknown, init?: { status?: number }): NextResponse {
      return new NextResponse(init?.status ?? 200);
    }
  }
  return { NextRequest, NextResponse };
});

vi.mock("@/lib/auth/session", () => ({
  verifyToken: vi.fn(),
}));

import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/security/api-auth";
import { verifyToken } from "@/lib/auth/session";

const verifyTokenMock = vi.mocked(verifyToken);

function req(
  url = "http://localhost/api/admin/sales",
  init?: { headers?: Record<string, string>; cookie?: string }
) {
  return new NextRequest(url, init);
}

beforeEach(() => {
  resetRateLimits();
  verifyTokenMock.mockReset();
  verifyTokenMock.mockResolvedValue({
    userId: 1,
    username: "admin",
    email: "a@b.c",
    iat: 1,
    exp: 2,
  });
});

describe("security.apiAuth - origen (CSRF)", () => {
  it("rechaza Origin cross-site con 403", async () => {
    const res = await requireApiAuth(
      req("http://localhost/api/admin/sales", {
        headers: { origin: "https://evil.example", "x-forwarded-for": "10.0.0.1" },
      })
    );
    expect(res).toBeInstanceOf(NextResponse);
    expect((res as NextResponse).status).toBe(403);
  });

  it("rechaza Origin malformado con 403", async () => {
    const res = await requireApiAuth(
      req("http://localhost/api/admin/sales", {
        headers: { origin: "no-es-url", "x-forwarded-for": "10.0.0.1" },
      })
    );
    expect((res as NextResponse).status).toBe(403);
  });

  it("permite Origin del mismo host y continúa a verificación de sesión", async () => {
    const res = await requireApiAuth(
      req("http://localhost/api/admin/sales", {
        headers: { origin: "http://localhost", "x-forwarded-for": "10.0.0.1" },
        cookie: "tok-valido",
      })
    );
    expect(res).not.toBeInstanceOf(NextResponse);
    expect(verifyTokenMock).toHaveBeenCalledWith("tok-valido");
  });
});

describe("security.apiAuth - throttle de API", () => {
  it("permite hasta el límite y luego responde 429", async () => {
    let last: unknown = null;
    for (let i = 0; i < 60; i++) {
      last = await requireApiAuth(
        req("http://localhost/api/admin/sales", {
          headers: { "x-forwarded-for": "10.0.0.9" },
          cookie: "tok",
        })
      );
    }
    expect(last).not.toBeInstanceOf(NextResponse);

    const blocked = await requireApiAuth(
      req("http://localhost/api/admin/sales", {
        headers: { "x-forwarded-for": "10.0.0.9" },
        cookie: "tok",
      })
    );
    expect(blocked).toBeInstanceOf(NextResponse);
    expect((blocked as NextResponse).status).toBe(429);
  });
});

describe("security.apiAuth - básico", () => {
  it("rutas públicas pasan sin autenticar", async () => {
    const res = await requireApiAuth(req("http://localhost/api/products"));
    expect(res).toBeNull();
  });

  it("sin cookie responde 401", async () => {
    const res = await requireApiAuth(
      req("http://localhost/api/admin/sales", { headers: { "x-forwarded-for": "10.0.0.2" } })
    );
    expect((res as NextResponse).status).toBe(401);
  });

  it("con token inválido responde 401", async () => {
    verifyTokenMock.mockResolvedValue(null);
    const res = await requireApiAuth(
      req("http://localhost/api/admin/sales", {
        headers: { "x-forwarded-for": "10.0.0.2" },
        cookie: "token-falso",
      })
    );
    expect((res as NextResponse).status).toBe(401);
  });
});
