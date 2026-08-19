import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAccessToken,
  getNumberingRanges,
  createInvoice,
  invalidateTokenCache,
  FACTUS_HTTP_TIMEOUT_MS,
} from "@/lib/factus/factus.client";
import {
  FactusAuthError,
  FactusConfigError,
  FactusClientUnavailableError,
  FactusValidationError,
  FactusRateLimitError,
  FactusNotFoundError,
} from "@/lib/factus/errors";
import { FactusInvoicePayload } from "@/lib/factus/types";

const BASE_URL = "https://api-sandbox.factus.com.co";
const fetchMock = vi.mocked(fetch);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function jsonResponseWithHeaders(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
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

function abortError(): Error {
  const err = new Error("The operation was aborted.");
  err.name = "AbortError";
  return err;
}

/** Vacía la cola de microtasks para que las cadenas async registren sus timers antes de avanzar el reloj fake. */
function flushMicrotasks(): Promise<void> {
  let chain: Promise<void> = Promise.resolve();
  for (let i = 0; i < 10; i++) chain = chain.then(() => undefined);
  return chain;
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

describe("factus.client - timeout HTTP (F1)", () => {
  /** Simula un endpoint que nunca responde pero reacciona al abort del signal. */
  function hangingFetch(validateCalls?: { count: number }) {
    fetchMock.mockImplementation((input, init) => {
      const url = String(input);
      if (url.includes("/oauth/token")) {
        return Promise.resolve(tokenResponse("tok-1"));
      }
      if (validateCalls) validateCalls.count += 1;
      const signal = (init as RequestInit)?.signal as AbortSignal | undefined;
      return new Promise((_, reject) => {
        if (!signal) {
          reject(new Error("no se pasó signal al fetch"));
          return;
        }
        const onAbort = () => {
          signal.removeEventListener("abort", onAbort);
          reject(abortError());
        };
        signal.addEventListener("abort", onAbort, { once: true });
      });
    });
  }

  it("respuesta normal antes del timeout: comportamiento idéntico y sin abort", async () => {
    let aborted = false;
    fetchMock.mockImplementation((input, init) => {
      if (String(input).includes("/oauth/token")) {
        return Promise.resolve(tokenResponse("tok-1"));
      }
      const signal = (init as RequestInit)?.signal as AbortSignal | undefined;
      signal?.addEventListener("abort", () => {
        aborted = true;
      });
      return Promise.resolve(
        jsonResponse({ data: { reference_code: "FACT-1", number: "SETP1", is_validated: true, cufe: "cufe-1" } })
      );
    });

    const result = await createInvoice(minimalPayload());

    expect(result.data.is_validated).toBe(true);
    expect(aborted).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("al superar el timeout aborta el request (AbortController cancela el fetch)", async () => {
    let aborted = false;
    fetchMock.mockImplementation((input, init) => {
      if (String(input).includes("/oauth/token")) {
        return Promise.resolve(tokenResponse("tok-1"));
      }
      const signal = (init as RequestInit)?.signal as AbortSignal | undefined;
      return new Promise((_, reject) => {
        if (!signal) {
          reject(new Error("no se pasó signal al fetch"));
          return;
        }
        const onAbort = () => {
          signal.removeEventListener("abort", onAbort);
          aborted = true;
          reject(abortError());
        };
        signal.addEventListener("abort", onAbort, { once: true });
      });
    });

    const promise = createInvoice(minimalPayload()).then(
      () => null,
      (error) => error
    );
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(FACTUS_HTTP_TIMEOUT_MS);

    expect(aborted).toBe(true);
    expect(await promise).toBeInstanceOf(FactusClientUnavailableError);
  });

  it("timeout en API: FactusClientUnavailableError con mensaje seguro y SIN retry de la factura", async () => {
    const validateCalls = { count: 0 };
    hangingFetch(validateCalls);

    const promise = createInvoice(minimalPayload()).then(
      () => null,
      (error) => error
    );
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(FACTUS_HTTP_TIMEOUT_MS);

    const error = await promise;
    expect(error).toBeInstanceOf(FactusClientUnavailableError);
    const message = (error as Error).message;
    expect(message).toMatch(/Factus|tiempo/i);
    expect(message).not.toContain("tok-1");
    expect(message).not.toContain("test-secret");
    expect(message).not.toContain("test-password");

    expect(validateCalls.count).toBe(1);
    expect(fetchMock).toHaveBeenCalledTimes(2); // 1 OAuth + 1 validate; sin retry tras timeout
  });

  it("timeout en OAuth: FactusClientUnavailableError sin exponer credenciales", async () => {
    fetchMock.mockImplementation((input, init) => {
      const signal = (init as RequestInit)?.signal as AbortSignal | undefined;
      return new Promise((_, reject) => {
        if (!signal) {
          reject(new Error("no se pasó signal al fetch"));
          return;
        }
        const onAbort = () => {
          signal.removeEventListener("abort", onAbort);
          reject(abortError());
        };
        signal.addEventListener("abort", onAbort, { once: true });
      });
    });

    const promise = getAccessToken().then(
      () => null,
      (error) => error
    );
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(FACTUS_HTTP_TIMEOUT_MS);

    const error = await promise;
    expect(error).toBeInstanceOf(FactusClientUnavailableError);
    const message = (error as Error).message;
    expect(message).not.toContain("test-client");
    expect(message).not.toContain("test-secret");
    expect(message).not.toContain("test-password");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("factus.client - extracción de errores (F3)", () => {
  async function errorFrom(payload: unknown): Promise<Error> {
    fetchMock.mockImplementation((input) =>
      String(input).includes("/oauth/token")
        ? Promise.resolve(tokenResponse("tok-1"))
        : Promise.resolve(jsonResponse(payload, 422))
    );
    try {
      await createInvoice(minimalPayload());
      throw new Error("debería haber lanzado FactusValidationError");
    } catch (error) {
      return error as Error;
    }
  }

  it("error simple: message top-level preservado", async () => {
    const error = await errorFrom({ message: "campo items inválido" });
    expect(error).toBeInstanceOf(FactusValidationError);
    expect(error.message).toBe("campo items inválido");
  });

  it("data.errors como array de strings: errores incluidos", async () => {
    const error = await errorFrom({
      message: "falló",
      data: { errors: ["El campo tax_rate es requerido", "El código de referencia no es válido"] },
    });
    expect(error.message).toContain("El campo tax_rate es requerido");
    expect(error.message).toContain("El código de referencia no es válido");
  });

  it("data.errors como objetos con message/error/detail: mensajes extraídos", async () => {
    const error = await errorFrom({
      data: {
        errors: [
          { message: "El campo tax_rate es requerido" },
          { error: "El código de referencia no es válido" },
          { detail: "El número de la resolución no existe" },
        ],
      },
    });
    expect(error.message).toContain("El campo tax_rate es requerido");
    expect(error.message).toContain("El código de referencia no es válido");
    expect(error.message).toContain("El número de la resolución no existe");
  });

  it("data.errors como objeto campo->mensaje: pares preservados", async () => {
    const error = await errorFrom({
      data: {
        errors: { tax_rate: "El campo tax_rate es requerido", reference_code: "El código de referencia no es válido" },
      },
    });
    expect(error.message).toContain("tax_rate: El campo tax_rate es requerido");
    expect(error.message).toContain("reference_code: El código de referencia no es válido");
  });

  it("múltiples errores: combinación compacta sin duplicados", async () => {
    const error = await errorFrom({
      data: {
        errors: [
          { message: "Campo inválido" },
          { message: "Campo inválido" },
          "Campo inválido",
          { error: "Otro problema" },
        ],
      },
    });
    expect(error.message).toBe("Campo inválido; Otro problema");
  });

  it("mensaje demasiado largo: truncado a máximo 300 caracteres", async () => {
    const error = await errorFrom({
      data: { errors: ["x".repeat(500)] },
    });
    expect(error.message.length).toBeLessThanOrEqual(300);
    expect(error.message).toBe("x".repeat(300));
  });

  it("sin data.errors: comportamiento anterior conservado", async () => {
    const error = await errorFrom({ error: "algo falló" });
    expect(error.message).toBe("algo falló");
  });

  it("sin mensajes útiles: fallback HTTP status", async () => {
    const error = await errorFrom({ data: { is_validated: false } });
    expect(error.message).toBe("Factus respondió con HTTP 422");
  });

  it("campos sensibles: ningún secreto termina en el mensaje", async () => {
    const error = await errorFrom({
      data: {
        errors: [
          { message: "validación", access_token: "tok-secreto", client_secret: "secret-secreto" },
          { detail: "El campo username no es válido", password: "pass-secreto" },
        ],
      },
    });
    expect(error.message).not.toContain("tok-secreto");
    expect(error.message).not.toContain("secret-secreto");
    expect(error.message).not.toContain("pass-secreto");
    expect(error.message).not.toContain("test-password");
    expect(error.message).not.toContain("test-secret");
  });

  it("errores top-level y de data.errors combinados de forma compacta", async () => {
    const error = await errorFrom({
      message: "primero",
      error: "segundo",
      data: { errors: [{ message: "tercero" }] },
    });
    expect(error.message).toBe("primero; segundo; tercero");
  });
});

describe("factus.client - manejo semántico 429 y 404 (F4)", () => {
  async function sentError(payload: unknown, status: number, headers?: Record<string, string>): Promise<Error> {
    fetchMock.mockImplementation((input) =>
      String(input).includes("/oauth/token")
        ? Promise.resolve(tokenResponse("tok-1"))
        : Promise.resolve(headers ? jsonResponseWithHeaders(payload, status, headers) : jsonResponse(payload, status))
    );
    try {
      await createInvoice(minimalPayload());
      throw new Error("debería haber lanzado un error de Factus");
    } catch (error) {
      return error as Error;
    }
  }

  it("HTTP 429 → FactusRateLimitError", async () => {
    const error = (await sentError({ message: "rate limit" }, 429)) as FactusRateLimitError;
    expect(error).toBeInstanceOf(FactusRateLimitError);
    expect(error.statusCode).toBe(429);
    expect(error.code).toBe("FACTUS_RATE_LIMIT");
  });

  it("HTTP 429 con data.errors → mensaje seguro incluye los errores útiles", async () => {
    const error = await sentError(
      { data: { errors: ["Demasiadas solicitudes", "Espera unos segundos"] } },
      429
    );
    expect(error).toBeInstanceOf(FactusRateLimitError);
    expect(error.message).toContain("Demasiadas solicitudes");
    expect(error.message).toContain("Espera unos segundos");
  });

  it("HTTP 429 NO hace retry de autenticación", async () => {
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
        return Promise.resolve(jsonResponse({ message: "rate limit" }, 429));
      }
      return Promise.reject(new Error("unexpected"));
    });

    await getAccessToken(); // cachea tok-1 (OAuth 1)
    const error = await createInvoice(minimalPayload()).catch((e) => e);

    expect(error).toBeInstanceOf(FactusRateLimitError);
    expect(validateCalls).toBe(1);
    expect(tokenCalls).toBe(1); // SIN reintento de autenticación por 429
  });

  it("HTTP 429 con Retry-After → retryAfter conservado como metadata", async () => {
    const error = (await sentError({ message: "lento" }, 429, { "Retry-After": "30" })) as FactusRateLimitError;
    expect(error).toBeInstanceOf(FactusRateLimitError);
    expect(error.retryAfter).toBe(30);
  });

  it("HTTP 429 con Retry-After inválido → retryAfter undefined", async () => {
    const error = (await sentError({ message: "lento" }, 429, { "Retry-After": "no-en-segundos" })) as FactusRateLimitError;
    expect(error.retryAfter).toBeUndefined();
  });

  it("HTTP 404 → FactusNotFoundError diferenciable", async () => {
    const error = (await sentError({ message: "no existe" }, 404)) as FactusNotFoundError;
    expect(error).toBeInstanceOf(FactusNotFoundError);
    expect(error).not.toBeInstanceOf(FactusClientUnavailableError);
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe("FACTUS_NOT_FOUND");
  });

  it("HTTP 404 con mensaje de Factus → mensaje preservado de forma segura", async () => {
    const error = await sentError({ message: "El rango de numeración no existe" }, 404);
    expect(error).toBeInstanceOf(FactusNotFoundError);
    expect(error.message).toBe("El rango de numeración no existe");
  });

  it("HTTP 404 NO hace retry de autenticación", async () => {
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
        return Promise.resolve(jsonResponse({ message: "no existe" }, 404));
      }
      return Promise.reject(new Error("unexpected"));
    });

    await getAccessToken(); // cachea tok-1 (OAuth 1)
    const error = await createInvoice(minimalPayload()).catch((e) => e);

    expect(error).toBeInstanceOf(FactusNotFoundError);
    expect(validateCalls).toBe(1);
    expect(tokenCalls).toBe(1); // SIN reintento de autenticación por 404
  });

  it("HTTP 401 sigue haciendo exactamente un retry", async () => {
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

    await getAccessToken(); // cachea tok-1
    const result = await createInvoice(minimalPayload());

    expect(validateCalls).toBe(2);
    expect(tokenCalls).toBe(2);
    expect(result.data.is_validated).toBe(true);
  });

  it("HTTP 401 después del retry mantiene el comportamiento existente", async () => {
    fetchMock.mockImplementation((input) =>
      String(input).includes("/oauth/token")
        ? Promise.resolve(tokenResponse("tok-1"))
        : Promise.resolve(jsonResponse({}, 401))
    );

    await expect(createInvoice(minimalPayload())).rejects.toBeInstanceOf(FactusAuthError);
  });

  it("timeout sigue produciendo FactusClientUnavailableError", async () => {
    fetchMock.mockImplementation((input, init) => {
      if (String(input).includes("/oauth/token")) {
        return Promise.resolve(tokenResponse("tok-1"));
      }
      const signal = (init as RequestInit)?.signal as AbortSignal | undefined;
      return new Promise((_, reject) => {
        if (!signal) {
          reject(new Error("no se pasó signal al fetch"));
          return;
        }
        const onAbort = () => {
          signal.removeEventListener("abort", onAbort);
          reject(abortError());
        };
        signal.addEventListener("abort", onAbort, { once: true });
      });
    });

    const promise = getAccessToken().then(() =>
      createInvoice(minimalPayload()).then(
        () => null,
        (error) => error
      )
    );
    await flushMicrotasks();
    await vi.advanceTimersByTimeAsync(FACTUS_HTTP_TIMEOUT_MS);

    const error = await promise;
    expect(error).toBeInstanceOf(FactusClientUnavailableError);
    expect(error).not.toBeInstanceOf(FactusRateLimitError);
    expect(error).not.toBeInstanceOf(FactusNotFoundError);
  });

  it("HTTP 500/502/503 conserva el comportamiento existente", async () => {
    for (const status of [500, 502, 503]) {
      fetchMock.mockImplementation((input) =>
        String(input).includes("/oauth/token")
          ? Promise.resolve(tokenResponse("tok-1"))
          : Promise.resolve(jsonResponse({ message: "boom" }, status))
      );

      await expect(createInvoice(minimalPayload())).rejects.toBeInstanceOf(FactusClientUnavailableError);
    }
  });
});