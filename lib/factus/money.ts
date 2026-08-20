/**
 * Utilidad central de dinero para Café Creencia.
 *
 * Representación interna: centavos (BigInt). Todo el cálculo monetario se hace
 * con aritmética entera para evitar errores de punto flotante (0.1 + 0.2 !== 0.3).
 *
 * Política de redondeo: half away from zero, a 2 decimales (centavos).
 *
 * IVA incluido: precio final P, tasa r (19 => 19%). Factor = 1 + r/100.
 *   base = round(P / factor)
 *   IVA  = P - base
 * La resta garantiza base + IVA === P exacto; jamás se calcula IVA = base * r.
 */

export type TaxRate = string | number | null | undefined;

const SCALE = 100n;

// Máximo 2 decimales: beyond that no es representable de forma determinista.
const MONEY_RE = /^-?\d+(\.\d{1,2})?$/;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

/** Convierte cantidad (COP, hasta 2 decimales) a centavos BigInt. Lanza si el formato es inválido. */
export function toCents(value: string | number | bigint): bigint {
  if (typeof value === "number") {
    return toCentsFromNumber(value);
  }
  if (typeof value === "bigint") {
    return value;
  }
  const src = value.trim().replace(",", ".");
  if (!MONEY_RE.test(src)) {
    throw new MoneyError(`Valor monetario inválido: "${value}"`);
  }
  const negative = src.startsWith("-");
  const [intPart, fracPart = ""] = (negative ? src.slice(1) : src).split(".");
  const frac = fracPart.padEnd(2, "0").slice(0, 2);
  const cents = BigInt(intPart || "0") * SCALE + BigInt(frac || "0");
  return negative ? -cents : cents;
}

/** Número (moneda de punto flotante) -> centavos con redondeo a 2 decimales (half away from zero). */
export function toCentsFromNumber(value: number): bigint {
  if (!Number.isFinite(value)) {
    throw new MoneyError(`Valor monetario inválido: ${value}`);
  }
  const negative = value < 0;
  const abs = Math.abs(value);
  const scaled = Math.round(abs * 100);
  const cents = BigInt(scaled);
  return negative ? -cents : cents;
}

/** Formatea centavos a string monetario con 2 decimales. Ej: 3500000n -> "35000.00". */
export function toMoneyString(cents: bigint): string {
  const negative = cents < 0n;
  const abs = negative ? -cents : cents;
  const whole = abs / SCALE;
  const frac = abs % SCALE;
  return `${negative ? "-" : ""}${whole}.${frac.toString().padStart(2, "0")}`;
}

/** Centavos -> número (solo para lectura/display; no usar en cálculos críticos). */
export function toNumber(cents: bigint): number {
  return Number(toMoneyString(cents));
}

export function add(a: bigint, b: bigint): bigint {
  return a + b;
}

export function subtract(a: bigint, b: bigint): bigint {
  return a - b;
}

/** Multiplicación por entero (p. ej. cantidad). */
export function multiplyInteger(a: bigint, factor: number | bigint): bigint {
  if (typeof factor === "number" && !Number.isInteger(factor)) {
    throw new MoneyError(`Factor monetario debe ser entero: ${factor}`);
  }
  return a * BigInt(factor);
}

/**
 * División entera con redondeo half away from zero (a 0 decimales del resultado).
 * Interna; para dinero siempre operamos a escala de centavos con el numerador ya escalado.
 */
export function divideRound(a: bigint, b: bigint): bigint {
  if (b === 0n) throw new MoneyError("División por cero");
  if (a === 0n) return 0n;
  const negative = (a < 0n) !== (b < 0n);
  const aa = a < 0n ? -a : a;
  const bb = b < 0n ? -b : b;
  let q = aa / bb;
  const r = aa % bb;
  if (r * 2n >= bb) q += 1n;
  return negative ? -q : q;
}

export function addMany(values: bigint[]): bigint {
  return values.reduce((acc, v) => acc + v, 0n);
}

export function eq(a: bigint, b: bigint): boolean {
  return a === b;
}

export function neq(a: bigint, b: bigint): boolean {
  return a !== b;
}

export function gt(a: bigint, b: bigint): boolean {
  return a > b;
}

export function gte(a: bigint, b: bigint): boolean {
  return a >= b;
}

export function lt(a: bigint, b: bigint): boolean {
  return a < b;
}

export function lte(a: bigint, b: bigint): boolean {
  return a <= b;
}

/** Redondea a centavos (no-op sobre centavos, incluida por completitud de API). */
export function round(a: bigint): bigint {
  return a;
}

/**
 * Desglose de IVA incluido.
 *
 * @param totalCents precio final (incluye impuesto) en centavos.
 * @param rate tasa porcentual (19 => IVA 19%), como número o string. 0 => excluido/sin IVA.
 * @returns { base, tax } donde base + tax === totalCents exactamente, o null si rate es inválido.
 */
export function splitTaxIncluded(
  totalCents: bigint,
  rate: TaxRate
): { base: bigint; tax: bigint } | null {
  if (rate === null || rate === undefined || rate === "") return null;
  const rateNumber = typeof rate === "string" ? Number(rate) : rate;
  if (!Number.isFinite(rateNumber) || rateNumber < 0) return null;
  if (rateNumber === 0) {
    return { base: totalCents, tax: 0n };
  }
  // factor = 1 + r/100 => con 2 decimales de la tasa: denom = 10000 + r*100
  const rateScaled = BigInt(Math.round(rateNumber * 100));
  const denom = 10000n + rateScaled;
  const base = divideRound(totalCents * 10000n, denom);
  const tax = totalCents - base;
  return { base, tax };
}

/** Cálculo de base (precio sin IVA) dado un total con IVA incluido. null si la tasa no aplica. */
export function baseIncluded(totalCents: bigint, rate: TaxRate): bigint | null {
  const split = splitTaxIncluded(totalCents, rate);
  return split ? split.base : null;
}

/** Cálculo de IVA dado un total con IVA incluido. null si la tasa no aplica. */
export function taxIncluded(totalCents: bigint, rate: TaxRate): bigint | null {
  const split = splitTaxIncluded(totalCents, rate);
  return split ? split.tax : null;
}