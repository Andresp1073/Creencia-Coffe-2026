"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { usePagedList } from "@/components/ui/use-paged-list";
import { Pagination } from "@/components/ui/pagination";

interface Movement {
  id: number;
  date: string;
  product_name: string;
  type: "entrada" | "salida";
  qty: number;
  note?: string;
}

interface Props {
  initialMovements: Movement[];
}

export function MovementsRecentClient({ initialMovements }: Props) {
  const { page, setPage, totalPages, totalItems, pagedItems } = usePagedList(initialMovements);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-foreground">Movimientos recientes</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Últimos movimientos de inventario registrados en el sistema
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden" role="region" aria-label="Movimientos recientes">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4 font-medium text-left" scope="col">Fecha</th>
                <th className="px-6 py-4 font-medium text-left" scope="col">Producto</th>
                <th className="px-6 py-4 font-medium text-left" scope="col">Tipo</th>
                <th className="px-6 py-4 font-medium text-right" scope="col">Cantidad</th>
                <th className="px-6 py-4 font-medium text-left" scope="col">Nota</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    No hay movimientos registrados
                  </td>
                </tr>
              ) : pagedItems.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">{m.date}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{m.product_name}</td>
                  <td className="px-6 py-4">
                    <Badge variant={m.type === "entrada" ? "success" : "danger"} size="sm">
                      {m.type === "entrada" ? "Entrada" : "Salida"}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right font-medium text-foreground tabular-nums">{m.qty}</td>
                  <td className="px-6 py-4 text-muted-foreground text-sm">{m.note || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          onPageChange={setPage}
        />
      </div>

      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        <Link2 className="size-3.5" aria-hidden="true" />
        Gestiona entradas y salidas de stock desde el módulo de Inventario.
      </p>
    </div>
  );
}