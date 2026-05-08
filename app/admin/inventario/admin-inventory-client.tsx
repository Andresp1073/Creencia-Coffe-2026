"use client";

import { useState, useCallback } from "react";
import { ArrowUp, ArrowDown, CheckCircle, AlertCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: number;
  name: string;
  presentation: string;
  stock: number;
  active?: boolean;
}

interface Movement {
  id: number;
  date: string;
  product_name: string;
  type: "entrada" | "salida";
  qty: number;
  note?: string;
}

interface Props {
  initialProducts: Product[];
  initialMovements: Movement[];
}

interface Toast {
  message: string;
  type: "success" | "error" | "warning";
}

function StockModal({ 
  product, 
  type, 
  onClose, 
  onSaved 
}: { 
  product: Product; 
  type: "entrada" | "salida"; 
  onClose: () => void; 
  onSaved: (message: string, type: "success" | "error" | "warning") => void;
}) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (qty <= 0) return;
    setSaving(true);
    try {
      const newStock = type === "entrada" 
        ? (product.stock || 0) + qty 
        : Math.max(0, (product.stock || 0) - qty);
      
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: product.id,
          stock: newStock
        })
      });

      if (res.ok) {
        const movementData = {
          product_id: Number(product.id),
          type: type,
          quantity: Number(qty),
          reason: note || null
        };
        
        await fetch("/api/admin/inventory-movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(movementData)
        });
        
        if (type === "salida" && newStock <= 5) {
          onSaved(`Stock actualizado. Alerta: "${product.name}" tiene stock bajo (${newStock} unidades)`, "warning");
        } else {
          onSaved("Movimiento registrado correctamente", "success");
        }
        onClose();
      } else {
        onSaved("Error al actualizar el stock", "error");
      }
    } catch (err) {
      onSaved("Error al registrar movimiento", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={type === "entrada" ? "Entrada de stock" : "Salida de stock"}
      description={`${product.name} - ${product.presentation}`}
      size="sm"
    >
      <div className="space-y-4">
        <div>
          <label htmlFor="stock-qty" className="block text-sm font-medium text-foreground mb-2">Cantidad</label>
          <input
            id="stock-qty"
            type="number"
            min={1}
            value={qty || ""}
            onChange={(e) => setQty(parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
          />
        </div>
        <div>
          <label htmlFor="stock-note" className="block text-sm font-medium text-foreground mb-2">Nota (opcional)</label>
          <input
            id="stock-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Compra semanal"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1" aria-label="Cancelar">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={saving} disabled={qty <= 0} className="flex-1">
            Registrar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function AdminInventoryClient({ initialProducts, initialMovements }: Props) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [movements] = useState<Movement[]>(initialMovements);
  const [stockModal, setStockModal] = useState<{ product: Product; type: "entrada" | "salida" } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" | "warning") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const stockStatus = (stock: number) => {
    if (stock === 0) return { label: "Sin stock", variant: "danger" as const };
    if (stock <= 5) return { label: "Stock bajo", variant: "warning" as const };
    return { label: "Normal", variant: "success" as const };
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div 
          role="alert"
          aria-live="polite"
          className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-elevated animate-slide-in-right ${
            toast.type === "success" ? "bg-success text-white" : toast.type === "warning" ? "bg-warning text-white" : "bg-danger text-white"
          }`}>
          {toast.type === "success" ? <CheckCircle className="size-5" aria-hidden="true" /> : toast.type === "warning" ? <AlertCircle className="size-5" aria-hidden="true" /> : <AlertCircle className="size-5" aria-hidden="true" />}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {stockModal && (
        <StockModal
          product={stockModal.product}
          type={stockModal.type}
          onClose={() => setStockModal(null)}
          onSaved={(message, type) => {
            showToast(message, type);
            if (type === "success") {
              fetch("/api/admin/products", { credentials: "include" })
                .then(res => res.json())
                .then(data => setProducts(data.products || []));
            }
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Inventario</h1>
          <p className="text-sm text-muted-foreground mt-1">Controla el stock y los movimientos de cada producto</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden" role="region" aria-label="Stock por producto">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="font-display text-xl text-foreground">Stock por producto</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4 font-medium text-left" scope="col">Producto</th>
                <th className="px-6 py-4 font-medium text-left" scope="col">Presentación</th>
                <th className="px-6 py-4 font-medium text-right" scope="col">Stock</th>
                <th className="px-6 py-4 font-medium text-center" scope="col">Estado</th>
                <th className="px-6 py-4 font-medium text-right" scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {products.map((p) => {
                const status = stockStatus(p.stock || 0);
                return (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{p.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{p.presentation}</td>
                    <td className="px-6 py-4 text-right tabular-nums font-medium text-foreground">{p.stock || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant={status.variant} size="sm" aria-label={`Estado: ${status.label}`}>{status.label}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStockModal({ product: p, type: "entrada" })}
                          className="gap-1.5"
                          aria-label={`Registrar entrada de stock para ${p.name}`}
                        >
                          <ArrowUp className="size-3.5" aria-hidden="true" />
                          Entrada
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStockModal({ product: p, type: "salida" })}
                          className="gap-1.5 text-danger hover:text-danger"
                          aria-label={`Registrar salida de stock para ${p.name}`}
                        >
                          <ArrowDown className="size-3.5" aria-hidden="true" />
                          Salida
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden" role="region" aria-label="Movimientos recientes">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="font-display text-xl text-foreground">Movimientos recientes</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3.5 font-medium text-left" scope="col">Fecha</th>
              <th className="px-6 py-3.5 font-medium text-left" scope="col">Producto</th>
              <th className="px-6 py-3.5 font-medium text-left" scope="col">Tipo</th>
              <th className="px-6 py-3.5 font-medium text-right" scope="col">Cantidad</th>
              <th className="px-6 py-3.5 font-medium text-left" scope="col">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {movements.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  No hay movimientos registrados
                </td>
              </tr>
            ) : movements.map((m) => (
              <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 text-muted-foreground">{m.date}</td>
                <td className="px-6 py-4 font-medium text-foreground">{m.product_name}</td>
                <td className="px-6 py-4">
                  <Badge variant={m.type === "entrada" ? "success" : "danger"} size="sm">
                    {m.type === "entrada" ? "Entrada" : "Salida"}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right font-medium text-foreground">{m.qty}</td>
                <td className="px-6 py-4 text-muted-foreground text-sm">{m.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}