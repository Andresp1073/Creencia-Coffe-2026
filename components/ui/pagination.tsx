import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  readonly page: number;
  readonly totalPages: number;
  readonly totalItems?: number;
  readonly onPageChange: (page: number) => void;
  readonly loading?: boolean;
}

/** Genera la secuencia de páginas visible (con "…" cuando hay muchas). Los huecos usan keys estables. */
function pageNumbers(current: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | string)[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) pages.push(`gap-${start - 1}`);
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push(`gap-${end + 1}`);
  pages.push(totalPages);
  return pages;
}

/**
 * Paginación reutilizable (1 2 3… + Anterior/Siguiente).
 * Se oculta automáticamente cuando solo hay una página.
 */
export function Pagination({
  page,
  totalPages,
  totalItems,
  onPageChange,
  loading = false,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="flex items-center justify-between gap-4 px-6 py-4 border-t border-border/50 bg-muted/30"
      aria-label="Paginación"
    >
      <p className="text-xs text-muted-foreground">
        Página <span className="font-medium text-foreground">{page}</span> de{" "}
        {totalPages}
        {totalItems != null && <> · {totalItems} en total</>}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Anterior
        </Button>
        <div className="flex items-center gap-1">
          {pageNumbers(page, totalPages).map((n) =>
            typeof n === "string" ? (
              <span
                key={n}
                className="px-1.5 text-sm text-muted-foreground select-none"
              >
                …
              </span>
            ) : (
              <Button
                key={n}
                variant={n === page ? "primary" : "ghost"}
                size="sm"
                className="min-w-9 h-9 px-2 text-sm"
                onClick={() => onPageChange(n)}
                disabled={loading}
                aria-label={`Ir a la página ${n}`}
                aria-current={n === page ? "page" : undefined}
              >
                {n}
              </Button>
            ),
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || loading}
          aria-label="Página siguiente"
        >
          Siguiente
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
