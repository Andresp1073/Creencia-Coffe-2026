/**
 * Cálculo de ventas a nivel de servidor (Fase 2 Factus).
 *
 * El backend es la autoridad de precios y totales: el precio unitario de cada
 * línea SIEMPRE proviene de products.price (DECIMAL de BD, convertido con
 * centavos BigInt), nunca del precio enviado por el cliente.
 *
 * Funciones puras -> directamente testeables sin BD real.
 */

import { addMany, multiplyInteger, splitTaxIncluded, toCents } from "./money";
import { ValidationError } from "@/lib/security/safe-error";

export interface OrderLine {
  productId: number;
  qty: number;
}

export interface ProductRateRow {
  price: string | number;
  taxRate: string | number | null;
}

export interface OrderFigures {
  /** Total de cada línea (precio unitario server-side x qty), en centavos. */
  lineCents: bigint[];
  /** Total de la venta en centavos. */
  totalCents: bigint;
  /** Suma de bases (sin IVA). null si algún producto tiene tax_rate NULL (no configurado). */
  subtotalCents: bigint | null;
  /** Suma de IVA. null si algún producto tiene tax_rate NULL (no configurado). */
  taxCents: bigint | null;
  /** Precio unitario (centavos) por productId, tomado de products.price. */
  unitPrices: Map<number, bigint>;
}

/**
 * Valida y normaliza el arreglo de ítems recibido del cliente.
 * Se ignora deliberadamente el precio enviado por el cliente (products.price manda).
 */
export function parseSaleItems(raw: unknown): OrderLine[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new ValidationError("Agrega al menos un producto");
  }
  const lines: OrderLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") {
      throw new ValidationError("Productos inválidos");
    }
    const id = Number((entry as Record<string, unknown>).id);
    const qty = Number((entry as Record<string, unknown>).qty);
    if (!Number.isInteger(id) || id <= 0) {
      throw new ValidationError("Producto con ID inválido");
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 9999) {
      throw new ValidationError(`Cantidad inválida para el producto ${id}`);
    }
    lines.push({ productId: id, qty });
  }
  return lines;
}

/**
 * Calcula los totales de la venta usando únicamente products.price (autoridad).
 *
 * Desglose de IVA: los precios son finales con IVA incluido; el IVA por línea se
 * calcula como total_linea - base. sub_total + tax_total - discount_total = total.
 *
 * Si CUALQUIER producto tiene tax_rate NULL (no configurado), subtotalCents y
 * taxCents son null (no se inventan tasas; la facturación posterior estará bloqueada
 * hasta configurar). En ese caso el orden conserva total y queda "pendiente" el desglose.
 */
export function computeOrderFigures(
  lines: OrderLine[],
  products: Record<number, ProductRateRow>
): OrderFigures {
  const unitPrices = new Map<number, bigint>();
  const lineCents: bigint[] = [];
  const lineTax: bigint[] = [];

  const canDecompose = lines.every((line) => {
    const product = products[line.productId];
    if (!product) return false;
    return product.taxRate !== null && product.taxRate !== undefined && product.taxRate !== "";
  });

  for (const line of lines) {
    const product = products[line.productId];
    if (!product) {
      throw new ValidationError(`Producto con ID ${line.productId} no encontrado`);
    }
    const priceCents = toCents(product.price);
    unitPrices.set(line.productId, priceCents);
    const lineTotal = multiplyInteger(priceCents, line.qty);
    lineCents.push(lineTotal);
    if (canDecompose) {
      const split = splitTaxIncluded(lineTotal, product.taxRate);
      // canDecompose garantiza tasa configurada y válida; split no es null.
      lineTax.push(split ? split.tax : 0n);
    }
  }

  const totalCents = addMany(lineCents);

  if (!canDecompose) {
    return { lineCents, totalCents, subtotalCents: null, taxCents: null, unitPrices };
  }

  const taxCents = addMany(lineTax);
  return {
    lineCents,
    totalCents,
    subtotalCents: totalCents - taxCents,
    taxCents,
    unitPrices,
  };
}