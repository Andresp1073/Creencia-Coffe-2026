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
  queryMany: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/security/api-auth", () => ({
  requireApiAuth: vi.fn(),
}));

import { queryMany, withTransaction } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";
import { GET, POST } from "@/app/api/admin/sales/route";
import { NextRequest } from "next/server";

interface SqlCall {
  sql: string;
  params: unknown[];
}

const product = {
  id: 1,
  name: "Café 500g",
  stock: 10,
  price: "40000",
  presentation: "500g",
  tax_rate: "19",
};

function createConn(products: unknown[]) {
  const calls: SqlCall[] = [];
  const execute = vi.fn(async (sql: string, params: unknown[] = []) => {
    calls.push({ sql, params });
    if (sql.includes("FROM products WHERE")) return [products];
    if (sql.includes("INSERT INTO orders")) return [{ insertId: 77 }];
    return [{}];
  });
  return { execute, calls };
}

function makePostRequest(body: unknown) {
  return new NextRequest("http://localhost/api/admin/sales", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

async function postSale(body: unknown, products: unknown[] = []) {
  const conn = createConn(products);
  vi.mocked(withTransaction).mockImplementation(async (cb) => cb(conn as any));
  const res = await POST(makePostRequest(body));
  return { res, conn };
}

function ordersInsert(conn: ReturnType<typeof createConn>) {
  return conn.calls.find((c) => c.sql.includes("INSERT INTO orders"));
}

beforeEach(() => {
  vi.mocked(requireApiAuth).mockResolvedValue(null);
  vi.mocked(queryMany).mockReset();
  vi.mocked(withTransaction).mockReset();
});

describe("POST /api/admin/sales - datos de pago", () => {
  it("registra la venta y persiste payment_form, payment_method_code, payment_reference y payment_due_date", async () => {
    const { res, conn } = await postSale(
      {
        customer: "Cliente A",
        items: [{ id: "1", qty: 2 }],
        payment_form: "1",
        payment_method_code: "42",
        payment_reference: "CONS-9",
      },
      [product]
    );

    expect(res.status).toBe(200);
    const insert = ordersInsert(conn);
    expect(insert).toBeDefined();
    expect(insert!.params.slice(-4)).toEqual(["1", "42", "CONS-9", null]);
    const data = (await res.json()) as { id: number };
    expect(data.id).toBe(77);
  });

  it("crédito (payment_form=2) sin payment_due_date: rechaza", async () => {
    const { res } = await postSale(
      { customer: "A", items: [{ id: "1", qty: 1 }], payment_form: "2", payment_method_code: "10" },
      [product]
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("payment_due_date");
  });

  it("crédito con payment_due_date: lo persiste", async () => {
    const { res, conn } = await postSale(
      {
        customer: "A",
        items: [{ id: "1", qty: 1 }],
        payment_form: "2",
        payment_method_code: "10",
        payment_due_date: "2026-06-30",
      },
      [product]
    );
    expect(res.status).toBe(200);
    const insert = ordersInsert(conn);
    expect(insert!.params.slice(-4)).toEqual(["2", "10", null, "2026-06-30"]);
  });

  it("rechaza si payment_form falta", async () => {
    const { res } = await postSale(
      { customer: "A", items: [{ id: "1", qty: 1 }], payment_method_code: "10" },
      [product]
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("payment_form");
  });

  it("rechaza si payment_method_code falta", async () => {
    const { res } = await postSale(
      { customer: "A", items: [{ id: "1", qty: 1 }], payment_form: "1" },
      [product]
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("payment_method_code");
  });

  it("rechaza si payment_method_code no está en el catálogo", async () => {
    const { res } = await postSale(
      { customer: "A", items: [{ id: "1", qty: 1 }], payment_form: "1", payment_method_code: "99" },
      [product]
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("catálogo");
  });

  it("no abre la transacción cuando los datos de pago son inválidos", async () => {
    const { res } = await postSale(
      { customer: "A", items: [{ id: "1", qty: 1 }], payment_form: "1", payment_method_code: "99" },
      [product]
    );
    expect(res.status).toBe(400);
    expect(vi.mocked(withTransaction)).not.toHaveBeenCalled();
  });

  it("rechaza si falta payment_reference cuando el método la requiere", async () => {
    const { res } = await postSale(
      { customer: "A", items: [{ id: "1", qty: 1 }], payment_form: "1", payment_method_code: "42" },
      [product]
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("payment_reference");
  });

  it("no persiste payment_reference cuando el método no la requiere", async () => {
    const { res, conn } = await postSale(
      {
        customer: "A",
        items: [{ id: "1", qty: 1 }],
        payment_form: "1",
        payment_method_code: "10",
        payment_reference: "sobra",
        payment_due_date: "2026-06-30",
      },
      [product]
    );
    expect(res.status).toBe(200);
    const insert = ordersInsert(conn);
    expect(insert).toBeDefined();
    expect(insert!.params.slice(-4)).toEqual(["1", "10", null, null]);
  });
});

describe("POST /api/admin/sales - autoridad server-side", () => {
  it("rechaza si el total enviado no coincide con el calculado por el servidor", async () => {
    const { res } = await postSale(
      { customer: "A", items: [{ id: "1", qty: 2 }], total: "1", payment_form: "1", payment_method_code: "10" },
      [product]
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("no coincide");
  });

  it("ignora el precio enviado por el cliente y usa products.price del servidor", async () => {
    const { res, conn } = await postSale(
      {
        customer: "A",
        items: [{ id: "1", qty: 2, price: 1 }],
        total: 80000,
        payment_form: "1",
        payment_method_code: "10",
      },
      [product]
    );
    expect(res.status).toBe(200);
    const insert = ordersInsert(conn);
    const itemsJson = insert!.params[2] as string;
    const parsed = JSON.parse(itemsJson) as { price: number; qty: number }[];
    expect(parsed[0].price).toBe(40000);
    expect(parsed[0].qty).toBe(2);
  });

  it("rechaza la venta si el stock es insuficiente", async () => {
    const scarce = { ...product, stock: 1 };
    const { res } = await postSale(
      { customer: "A", items: [{ id: "1", qty: 5 }], payment_form: "1", payment_method_code: "10" },
      [scarce]
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: string };
    expect(data.error).toContain("Stock insuficiente");
  });

  it("descuenta stock y registra inventory_movements en ventas válidas", async () => {
    const { res, conn } = await postSale(
      { customer: "A", items: [{ id: "1", qty: 2 }], payment_form: "1", payment_method_code: "10" },
      [product]
    );
    expect(res.status).toBe(200);
    const update = conn.calls.find((c) => c.sql.includes("UPDATE products SET stock"));
    expect(update).toBeDefined();
    expect(update!.params).toEqual([2, 1]);
    expect(conn.calls.some((c) => c.sql.includes("INSERT INTO inventory_movements"))).toBe(true);
  });
});

describe("GET /api/admin/sales - ventas históricas", () => {
  it("devuelve ventas históricas sin exigir datos de pago", async () => {
    vi.mocked(queryMany)
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        {
          id: 1,
          customer: "Histórico",
          total: 40000,
          items: "[]",
          status: "pending",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ]);
    const res = await GET(new NextRequest("http://localhost/api/admin/sales"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      sales: { customer: string }[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    };
    expect(data.sales).toHaveLength(1);
    expect(data.sales[0].customer).toBe("Histórico");
    expect(data.pagination).toEqual({ page: 1, pageSize: 10, total: 1, totalPages: 1 });
  });

  it("aplica LIMIT/OFFSET a la página solicitada", async () => {
    vi.mocked(queryMany)
      .mockResolvedValueOnce([{ total: 35 }])
      .mockResolvedValueOnce([{ id: 4, customer: "Página 4", total: 1000, items: "[]", status: "pending", created_at: "2026-01-01T00:00:00.000Z" }]);
    const res = await GET(new NextRequest("http://localhost/api/admin/sales?page=3&pageSize=10"));
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      sales: { customer: string }[];
      pagination: { page: number; pageSize: number; total: number; totalPages: number };
    };
    expect(data.pagination).toEqual({ page: 3, pageSize: 10, total: 35, totalPages: 4 });
    expect(queryMany).toHaveBeenCalledWith(
      expect.stringContaining("LIMIT ? OFFSET ?"),
      [10, 20]
    );
  });
});
