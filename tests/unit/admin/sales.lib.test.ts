import { describe, it, expect, vi, beforeEach } from "vitest";
import { queryMany } from "@/lib/db";
import { getSalesPage, getSales, getProducts } from "@/lib/admin/sales";

vi.mock("@/lib/db", () => ({ queryMany: vi.fn() }));

beforeEach(() => {
  vi.mocked(queryMany).mockReset();
});

describe("lib/admin/sales - getSalesPage", () => {
  it("mapea fecha a string ISO y recorta payment_due_date a YYYY-MM-DD", async () => {
    vi.mocked(queryMany)
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([
        {
          id: 1,
          customer: "Cliente",
          total: "80000",
          items: '[{"id":"1","qty":2}]',
          status: "pending",
          date: new Date("2026-01-01T00:00:00Z"),
          payment_due_date: new Date("2026-06-30T12:30:00Z"),
        },
      ]);

    const page = await getSalesPage(1, 10);

    expect(page.total).toBe(1);
    expect(page.sales).toHaveLength(1);
    expect(page.sales[0].date).toBe("2026-01-01T00:00:00.000Z");
    expect(page.sales[0].payment_due_date).toBe("2026-06-30");
    expect(page.sales[0].items).toEqual([{ id: "1", qty: 2 }]);
  });

  it("cae a total 0 ante consulta fallida", async () => {
    vi.mocked(queryMany).mockRejectedValueOnce(new Error("db down"));

    const page = await getSalesPage(1);

    expect(page.sales).toEqual([]);
    expect(page.total).toBe(0);
    expect(page.totalPages).toBe(1);
  });

  it("calcula paginación y aplana valores numéricos", async () => {
    vi.mocked(queryMany)
      .mockResolvedValueOnce([{ total: 25 }])
      .mockResolvedValueOnce([
        {
          id: 2,
          customer: "P2",
          total: "50000.5",
          items: "[]",
          status: "pending",
          date: "2026-01-02",
        },
      ]);

    const page = await getSalesPage(3, 10);

    expect(page.total).toBe(25);
    expect(page.sales).toHaveLength(1);
    expect(page.totalPages).toBe(3);
    expect(page.page).toBe(3);
    expect(page.pageSize).toBe(10);
    expect(page.sales[0].total).toBe(50000.5);
  });
});

describe("lib/admin/sales - getSales", () => {
  it("pide página 1 con pageSize grande", async () => {
    vi.mocked(queryMany)
      .mockResolvedValueOnce([{ total: 2 }])
      .mockResolvedValueOnce([
        {
          id: 1,
          customer: "A",
          total: "1",
          items: "[]",
          status: "pending",
          date: "2026-01-01",
        },
        {
          id: 2,
          customer: "B",
          total: "2",
          items: "[]",
          status: "pending",
          date: "2026-01-02",
        },
      ]);

    const sales = await getSales();

    expect(sales).toHaveLength(2);
    expect(queryMany).toHaveBeenCalledWith(
      expect.stringContaining("LIMIT 50 OFFSET 0"),
    );
  });
});

describe("lib/admin/sales - getProducts", () => {
  it("mapea precio, derivados y activos boolean", async () => {
    vi.mocked(queryMany).mockResolvedValueOnce([
      {
        id: 1,
        name: "Café 500g",
        price: "40000",
        stock: "10",
        presentation: "500g",
        active: 1,
        tax_rate: "19",
      },
    ]);

    const products = await getProducts();

    expect(products).toHaveLength(1);
    expect(products[0].price).toBe(40000);
    expect(products[0].price_250g).toBe(22000);
    expect(products[0].price_125g).toBe(12000);
    expect(products[0].stock).toBe(10);
    expect(products[0].active).toBe(true);
    expect(products[0].tax_rate).toBe("19");
  });

  it("devuelve lista vacía ante consulta fallida", async () => {
    vi.mocked(queryMany).mockRejectedValueOnce(new Error("db down"));

    const products = await getProducts();

    expect(products).toEqual([]);
  });
});