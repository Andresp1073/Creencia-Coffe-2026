import { describe, it, expect } from "vitest";
import {
  toCents,
  toCentsFromNumber,
  toMoneyString,
  toNumber,
  add,
  subtract,
  multiplyInteger,
  divideRound,
  addMany,
  eq,
  neq,
  gt,
  gte,
  lt,
  lte,
  splitTaxIncluded,
  baseIncluded,
  taxIncluded,
  MoneyError,
} from "@/lib/factus/money";

describe("money.toCents", () => {
  it("convierte string entero", () => {
    expect(toCents("25000")).toBe(2500000n);
  });

  it("convierte string con 2 decimales", () => {
    expect(toCents("25000.00")).toBe(2500000n);
  });

  it("convierte número a centavos", () => {
    expect(toCents(25000)).toBe(2500000n);
  });

  it("acepta coma decimal", () => {
    expect(toCents("12,5")).toBe(1250n);
  });

  it("acepta bigint como centavos (identidad)", () => {
    expect(toCents(12345n)).toBe(12345n);
  });

  it("maneja negativos", () => {
    expect(toCents("-10.25")).toBe(-1025n);
  });

  it("rechaza más de 2 decimales", () => {
    expect(() => toCents("12.345")).toThrow(MoneyError);
  });

  it("rechaza texto no numérico", () => {
    expect(() => toCents("abc")).toThrow(MoneyError);
  });

  it("rechaza valores no finitos", () => {
    expect(() => toCentsFromNumber(NaN)).toThrow(MoneyError);
    expect(() => toCentsFromNumber(Infinity)).toThrow(MoneyError);
  });
});

describe("money.toMoneyString / toNumber", () => {
  it("formatea centavos a string con 2 decimales", () => {
    expect(toMoneyString(3500000n)).toBe("35000.00");
  });

  it("formatea negativos", () => {
    expect(toMoneyString(-1025n)).toBe("-10.25");
  });

  it("formatea fracción con cero a la izquierda", () => {
    expect(toMoneyString(5n)).toBe("0.05");
  });

  it("toNumber es consistente con toMoneyString", () => {
    expect(toNumber(3500000n)).toBe(35000);
  });
});

describe("money aritmética", () => {
  it("add y subtract", () => {
    expect(add(100n, 25n)).toBe(125n);
    expect(subtract(100n, 25n)).toBe(75n);
  });

  it("multiplyInteger por cantidad", () => {
    expect(multiplyInteger(2500000n, 3)).toBe(7500000n);
  });

  it("multiplyInteger rechaza factor no entero", () => {
    expect(() => multiplyInteger(2500000n, 1.5)).toThrow(MoneyError);
  });

  it("addMany suma listas", () => {
    expect(addMany([10n, 20n, 30n])).toBe(60n);
  });

  it("divideRound redondea half away from zero", () => {
    expect(divideRound(1n, 2n)).toBe(1n);
    expect(divideRound(2n, 4n)).toBe(1n);
    expect(divideRound(3n, 10n)).toBe(0n);
    expect(divideRound(-1n, 2n)).toBe(-1n);
    expect(divideRound(-3n, 10n)).toBe(0n);
  });

  it("divideRound lanza ante división por cero", () => {
    expect(() => divideRound(5n, 0n)).toThrow(MoneyError);
  });
});

describe("money comparaciones", () => {
  it("eq / neq / gt / gte / lt / lte", () => {
    expect(eq(100n, 100n)).toBe(true);
    expect(neq(100n, 101n)).toBe(true);
    expect(gt(101n, 100n)).toBe(true);
    expect(gte(100n, 100n)).toBe(true);
    expect(lt(99n, 100n)).toBe(true);
    expect(lte(100n, 100n)).toBe(true);
  });
});

describe("money.splitTaxIncluded", () => {
  it("desglosa IVA 19% incluido: base + tax === total", () => {
    const total = 11900n; // 119.00 COP con IVA incluido
    const split = splitTaxIncluded(total, 19);
    expect(split).not.toBeNull();
    expect(split!.base).toBe(10000n);
    expect(split!.tax).toBe(1900n);
    expect(split!.base + split!.tax).toBe(total);
  });

  it("tasa 0 => base = total, tax = 0", () => {
    const split = splitTaxIncluded(5000n, 0);
    expect(split).toEqual({ base: 5000n, tax: 0n });
  });

  it("acepta tasa como string", () => {
    const total = 11900n;
    const split = splitTaxIncluded(total, "19.00");
    expect(split!.base).toBe(10000n);
    expect(split!.tax).toBe(1900n);
  });

  it("total no divisible exactamente aún cumple base + tax === total", () => {
    const total = 100n; // 1.00 COP
    const split = splitTaxIncluded(total, 19);
    expect(split!.base + split!.tax).toBe(total);
  });

  it("rate null/undefined/vacío => null", () => {
    expect(splitTaxIncluded(5000n, null)).toBeNull();
    expect(splitTaxIncluded(5000n, undefined)).toBeNull();
    expect(splitTaxIncluded(5000n, "")).toBeNull();
  });

  it("rate inválida o negativa => null", () => {
    expect(splitTaxIncluded(5000n, "abc")).toBeNull();
    expect(splitTaxIncluded(5000n, -5)).toBeNull();
  });

  it("baseIncluded / taxIncluded delegados", () => {
    expect(baseIncluded(11900n, 19)).toBe(10000n);
    expect(taxIncluded(11900n, 19)).toBe(1900n);
    expect(baseIncluded(5000n, null)).toBeNull();
  });
});