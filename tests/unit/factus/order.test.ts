import { describe, it, expect } from "vitest";
import { parseSaleItems, computeOrderFigures, OrderLine } from "@/lib/factus/order";
import { ValidationError } from "@/lib/security/safe-error";
import { toMoneyString } from "@/lib/factus/money";

function productsFor(lines: OrderLine[], overrides: Record<number, { price: string | number; taxRate?: string | number | null }> = {}) {
  const map: Record<number, { price: string | number; taxRate: string | number | null }> = {};
  for (const line of lines) {
    const preset = overrides[line.productId];
    map[line.productId] = {
      price: preset?.price ?? "25000",
      taxRate: preset && typeof preset.taxRate !== "undefined" ? preset.taxRate : 19,
    };
  }
  return map;
}

describe("order.parseSaleItems", () => {
  it("parsea ítems válidos", () => {
    const raw = [
      { id: "1", qty: 2, price: 999999, name: "no importa" },
      { id: 2, qty: 1 },
    ];
    expect(parseSaleItems(raw)).toEqual([
      { productId: 1, qty: 2 },
      { productId: 2, qty: 1 },
    ]);
  });

  it("rechaza arreglo vacío o ausente", () => {
    expect(() => parseSaleItems([])).toThrow(ValidationError);
    expect(() => parseSaleItems(undefined)).toThrow(ValidationError);
  });

  it("rechaza id inválido", () => {
    expect(() => parseSaleItems([{ id: "abc", qty: 1 }])).toThrow(ValidationError);
    expect(() => parseSaleItems([{ id: -1, qty: 1 }])).toThrow(ValidationError);
  });

  it("rechaza cantidad 0, negativa o fraccionaria", () => {
    expect(() => parseSaleItems([{ id: 1, qty: 0 }])).toThrow(ValidationError);
    expect(() => parseSaleItems([{ id: 1, qty: -2 }])).toThrow(ValidationError);
    expect(() => parseSaleItems([{ id: 1, qty: 1.5 }])).toThrow(ValidationError);
  });
});

describe("order.computeOrderFigures", () => {
  it("total server-side: precio de BD x qty (ignora precio del cliente)", () => {
    // El cliente manda price=123, pero la autoridad es products.price=25000.
    const raw = [{ id: "1", qty: 3, price: 123 }];
    const lines = parseSaleItems(raw);
    const figures = computeOrderFigures(lines, productsFor(lines));
    expect(figures.totalCents).toBe(7500000n);
    expect(toMoneyString(figures.totalCents)).toBe("75000.00");
  });

  it("desglosa IVA 19%: subtotal + tax === total", () => {
    // price "119.00" con IVA incluido => base 100.00, tax 19.00
    const raw = [{ id: "1", qty: 1 }];
    const lines = parseSaleItems(raw);
    const figures = computeOrderFigures(lines, productsFor(lines, { 1: { price: "119.00", taxRate: 19 } }));
    expect(figures.totalCents).toBe(11900n);
    expect(figures.subtotalCents).toBe(10000n);
    expect(figures.taxCents).toBe(1900n);
    expect(figures.subtotalCents! + figures.taxCents!).toBe(figures.totalCents);
  });

  it("tasa 0 (excluido): tax 0 y base = total", () => {
    const raw = [{ id: "1", qty: 2 }];
    const lines = parseSaleItems(raw);
    // price "2000" = 2000.00 COP => 200000n centavos por unidad
    const figures = computeOrderFigures(lines, productsFor(lines, { 1: { price: "2000", taxRate: 0 } }));
    expect(figures.totalCents).toBe(400000n);
    expect(figures.taxCents).toBe(0n);
    expect(figures.subtotalCents).toBe(400000n);
  });

  it("mezcla productos con tasa 19 y 0: desglose agrega por línea", () => {
    const raw = [
      { id: "1", qty: 1 },
      { id: "2", qty: 1 },
    ];
    const lines = parseSaleItems(raw);
    // 119.00 (IVA 19 => base 100.00, tax 19.00) + 100.00 (tasa 0 => base 100.00, tax 0)
    const figures = computeOrderFigures(lines, productsFor(lines, {
      1: { price: "119.00", taxRate: 19 },
      2: { price: "100", taxRate: 0 },
    }));
    expect(figures.totalCents).toBe(21900n);
    expect(figures.subtotalCents).toBe(20000n);
    expect(figures.taxCents).toBe(1900n);
  });

  it("tax_rate NULL => subtotal/tax null (no se inventan tasas) pero total sí se calcula", () => {
    const raw = [{ id: "1", qty: 2 }];
    const lines = parseSaleItems(raw);
    const figures = computeOrderFigures(lines, productsFor(lines, { 1: { price: "25000", taxRate: null } }));
    expect(figures.totalCents).toBe(5000000n);
    expect(figures.subtotalCents).toBeNull();
    expect(figures.taxCents).toBeNull();
  });

  it("mezcla productos, uno con NULL => desglose null en toda la orden", () => {
    const raw = [
      { id: "1", qty: 1 },
      { id: "2", qty: 1 },
    ];
    const lines = parseSaleItems(raw);
    const figures = computeOrderFigures(lines, productsFor(lines, {
      1: { price: "119.00", taxRate: 19 },
      2: { price: "25000", taxRate: null },
    }));
    expect(figures.totalCents).toBe(11900n + 2500000n);
    expect(figures.subtotalCents).toBeNull();
    expect(figures.taxCents).toBeNull();
  });

  it("expone el precio unitario por productId (snapshot)", () => {
    const raw = [{ id: "1", qty: 2 }];
    const lines = parseSaleItems(raw);
    const figures = computeOrderFigures(lines, productsFor(lines, { 1: { price: "25000.00", taxRate: 19 } }));
    expect(figures.unitPrices.get(1)).toBe(2500000n);
  });

  it("lanza si un producto no existe", () => {
    const raw = [{ id: "99", qty: 1 }];
    const lines = parseSaleItems(raw);
    const products: Record<number, { price: string; taxRate: string | number | null }> = {};
    expect(() => computeOrderFigures(lines, products)).toThrow(ValidationError);
  });

  it("mantiene cantidad mayor a 1 sin redondeos intermedios", () => {
    // Precio unitario con decimales exactos en centavos: 3.50 x 3 = 10.50
    const raw = [{ id: "1", qty: 3 }];
    const lines = parseSaleItems(raw);
    const figures = computeOrderFigures(lines, productsFor(lines, { 1: { price: "3.50", taxRate: 19 } }));
    expect(figures.totalCents).toBe(1050n);
    expect(toMoneyString(figures.totalCents)).toBe("10.50");
  });
});