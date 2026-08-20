import { useState } from "react";

/**
 * Paginación client-side para listas ya cargadas en memoria.
 * - `pagedItems`: slice visible de la página actual.
 * - `totalPages`: 1 si la lista cabe en una sola página (el control de paginación
 *   se oculta automáticamente en ese caso).
 * - La página se ajusta (clamp) automáticamente si la lista se reduce.
 */
export function usePagedList<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedItems = items.slice((safePage - 1) * pageSize, safePage * pageSize);

  return {
    page: safePage,
    setPage,
    totalPages,
    totalItems: items.length,
    pagedItems,
  };
}
