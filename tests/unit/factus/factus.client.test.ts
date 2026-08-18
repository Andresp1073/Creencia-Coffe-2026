import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAccessToken,
  getNumberingRanges,
  createInvoice,
  invalidateTokenCache,
} from "@/lib/factus/factus.client";
import {
  FactusAuthError,
  FactusConfigError,
  FactusClientUnavailableError,
  FactusValidationError,
} from "@/lib/factus/errors";
import { FactusInvoicePayload } from "@/lib/factus/types";

const BASE_URL = "https://api-sandbox.factus.com.co";
const fetchMock = vi.mocked(fetch);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function tokenResponse(accessToken: string, expiresIn = 3600) {
  return jsonResponse({ access_token: accessToken, token_type: "bearer", expires_in: expiresIn });
}

function minimalPayload(): FactusInvoicePayload {
  return {
    reference_code: "FACT-1",
    document: "01",
    operation_type: "10",
    send_email: true,
    cash_rounding_amount: "0.00",
    payment_details: [{ payment_form: "1", payment_method_code: "10", amount: "50000.00" }],
    customer: {
      identification_document_code: "13",
      identification: "123456789",
      legal_organization_code: "2",
      names: "Juan Pérez",
    },
    items: [
      {
        code_reference: "PROD-1",
        name: "Café",
        quantity: "2.00",
        discount_rate: "0.00",
        price: "100.00",
        unit_measure_code: "94",
        standard_code: "999",
        taxes: [{ code: "01", rate: "19.00" }],
      },
    ],
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  invalidateTokenCache();
  process.env.FACTUS_BASE_URL = BASE_URL;
  process.env.FACTUS_CLIENT_ID = "test-client";
  process.env.FACTUS_CLIENT_SECRET = "test-secret";
  process.env.FACTUS_USERNAME = "test-user@factus.com.co";
  process.env.FACTUS_PASSWORD = "test-password";
  fetchMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  invalidateTokenCache();
  delete process.env.FACTUS_BASE_URL;
  delete process.env.FACTUS_CLIENT_ID;
  delete process.env.FACTUS_CLIENT_SECRET;
  delete process.env.FACTUS_USERNAME;
  delete process.env.FACTUS_PASSWORD;
});

describe("factus.client.getAccessToken", () => {
  it("autentica con password grant (form-urlencoded) según documentación oficial de Factus", async () => {
    fetchMock.mockImplementation((input) =>
      String(input).includes("/oauth/token")
        ? Promise.resolve(tokenResponse("tok-1"))
        : Promise.reject(new Error("no debería llamarse"))
    );

    await getAccessToken();

    const call = fetchMock.mock.calls[0];
    const url = String(call[0]);
    const init = call[1] as RequestInit;
    const headers = (init.headers || {}) as Record<string, string>;

    expect(url).toBe(`${BASE_URL}/oauth/token`);
    expect(init.method).toBe("POST");
    expect(headers["Content-Type"]).toBe("application/x-www-form-urlencoded");
    expect(headers["Accept"]).toBe("application/json");

    const body = new URLSearchParams(String(init.body));
    expect(body.get("grant_type")).toBe("password");
    expect(body.get("client_id")).toBe("test-client");
    expect(body.get("client_secret")).toBe("test-secret");
    expect(body.get("username")).toBe("test-user@factus.com.co");
    expect(body.get("password")).toBe("test-password");
  });

  it("obtiene el token y lo reutiliza mientras es válido", async () => {
    fetchMock.mockImplementation((input) =>
      String(input).includes("/oauth/token")
        ? Promise.resolve(tokenResponse("tok-1"))
        : Promise.reject(new Error("no debería llamarse"))
    );

    const first = await getAccessToken();
    const second = await getAccessToken();

    expect(first).toBe("tok-1");
    expect(second).toBe("tok-1");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("renueva el token cuando caducó", async () => {
    fetchMock.mockImplementation((input) =>
      String(input).includes("/oauth/token")
        ? Promise.resolve(tokenResponse("tok-1", 3600))
        : Promise.reject(new Error("no debería llamarse"))
    );

    await getAccessToken();

    // Expira (3600s) + margen de frescura (60s)
    vi.advanceTimersByTime((3600 + 61) * 1000);

    await getAccessToken();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lanza FactusAuthError si OAuth falla", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ error: "invalid_client" }, 400));

    await expect(getAccessToken()).rejects.toBeInstanceOf(FactusAuthError);
  });

  it("lanza FactusAuthError si no hay access_token", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ hint: "nada" }));

    await expect(getAccessToken()).rejects.toBeInstanceOf(FactusAuthError);
  });

  it("lanza FactusConfigError si faltan variables de entorno", async () => {
    delete process.env.FACTUS_BASE_URL;

    await expect(getAccessToken()).rejects.toBeInstanceOf(FactusConfigError);
  });

  it("lanza FactusConfigError si faltan FACTUS_USERNAME/FACTUS_PASSWORD", async () => {
    delete process.env.FACTUS_USERNAME;

    await expect(getAccessToken()).rejects.toBeInstanceOf(FactusConfigError);
  });
});

describe("factus.client.createInvoice", () => {
  it("reutiliza token y envía el payload", async () => {
    fetchMock.mockImplementation((input) => {
      if (String(input).includes("/oauth/token")) {
        return Promise.resolve(tokenResponse("tok-1"));
      }
      return Promise.resolve(
        jsonResponse({
          status: "Created",
          data: { reference_code: "FACT-1", number: "SETP1", is_validated: true, cufe: "cufe-1" },
        })
      );
    });

    const result = await createInvoice(minimalPayload());

    expect(result.data.is_validated).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const validateCall = fetchMock.mock.calls[1];
    expect(String(validateCall[0])).toContain("/v2/bills/validate");
    expect((validateCall[1] as RequestInit).headers).toEqual(
      expect.objectContaining({ Authorization: "Bearer tok-1" })
    );
  });

  it("ante 401 invalida el token, obtiene uno nuevo y reintenta UNA vez", async () => {
    let tokenCalls = 0;
    let validateCalls = 0;

    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/oauth/token")) {
        tokenCalls += 1;
        return Promise.resolve(tokenResponse(`tok-${tokenCalls}`));
      }
      if (url.includes("/v2/bills/validate")) {
        validateCalls += 1;
        if (validateCalls === 1) {
          return Promise.resolve(jsonResponse({}, 401));
        }
        return Promise.resolve(
          jsonResponse({ data: { reference_code: "FACT-1", number: "SETP1", is_validated: true } })
        );
      }
      return Promise.reject(new Error("unexpected"));
    });

    // Cachear tok-1 primero
    await getAccessToken();
    const result = await createInvoice(minimalPayload());

    expect(validateCalls).toBe(2);
    expect(tokenCalls).toBe(2);
    expect(result.data.is_validated).toBe(true);
  });

  it("lanza FactusValidationError si Factus rechaza el payload (400/422)", async () => {
    fetchMock.mockImplementation((input) =>
      String(input).includes("/oauth/token")
        ? Promise.resolve(tokenResponse("tok-1"))
        : Promise.resolve(jsonResponse({ message: "campo items inválido" }, 422))
    );

    await expect(createInvoice(minimalPayload())).rejects.toBeInstanceOf(FactusValidationError);
  });

  it("lanza FactusClientUnavailableError ante un error 500 de Factus", async () => {
    fetchMock.mockImplementation((input) =>
      String(input).includes("/oauth/token")
        ? Promise.resolve(tokenResponse("tok-1"))
        : Promise.resolve(jsonResponse({ message: "boom" }, 500))
    );

    await expect(createInvoice(minimalPayload())).rejects.toBeInstanceOf(FactusClientUnavailableError);
  });

  it("lanza FactusAuthError si tras reintento sigue devolviendo 401", async () => {
    fetchMock.mockImplementation((input) =>
      String(input).includes("/oauth/token")
        ? Promise.resolve(tokenResponse("tok-1"))
        : Promise.resolve(jsonResponse({}, 401))
    );

    await expect(createInvoice(minimalPayload())).rejects.toBeInstanceOf(FactusAuthError);
  });
});

describe("factus.client.getNumberingRanges", () => {
  it("consulta los rangos disponibles", async () => {
    fetchMock.mockImplementation((input) =>
      String(input).includes("/oauth/token")
        ? Promise.resolve(tokenResponse("tok-1"))
        : Promise.resolve(jsonResponse({ data: [{ id: 389, active: true }] }))
    );

    const ranges = await getNumberingRanges();

    expect(ranges).toEqual([{ id: 389, active: true }]);
  });

  it("acepta arreglo directo", async () => {
    fetchMock.mockImplementation((input) =>
      String(input).includes("/oauth/token")
        ? Promise.resolve(tokenResponse("tok-1"))
        : Promise.resolve(jsonResponse([{ id: 1 }, { id: 2 }]))
    );

    const ranges = await getNumberingRanges();

    expect(ranges).toHaveLength(2);
  });
});