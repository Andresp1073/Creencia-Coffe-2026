/**
 * Normalización de presentaciones de producto.
 *
 * El sistema tiene una inconsistencia histórica:
 *   products.presentation:      "500g" | "250g" | "125g"
 *   orders.items[].presentation: "500grs" | "250grs" | "125grs"
 *
 * Esta función normaliza SÓLO para comparación/lectura. Nunca para modificar
 * registros históricos (no se ejecuta UPDATE masivo sobre orders.items).
 *
 * Tolerante: "500grs" -> "500g", "500gr" -> "500g", "250 g" -> "250g", "125G" -> "125g".
 */

export function normalizePresentation(value: string | null | undefined): string {
  if (!value) return "";
  const match = String(value)
    .trim()
    .toLowerCase()
    .match(/^(\d+)\s*(g|gr|grs)?$/);
  if (match) {
    return `${Number(match[1])}g`;
  }
  return String(value).trim().toLowerCase();
}

/** Mapea una presentación nominal (la que usa el cliente) a su etiqueta canónica de catálogo. */
export function canonicalPresentation(value: string | null | undefined): string {
  if (!value) return "";
  const match = String(value)
    .trim()
    .toLowerCase()
    .match(/^(\d+)\s*(g|gr|grs)?$/);
  return match ? `${Number(match[1])}g` : String(value).trim().toLowerCase();
}