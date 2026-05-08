"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, X } from "lucide-react";
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

function StockModal({ product, type, onClose, onSaved }: { product: Product; type: "entrada" | "salida"; onClose: () => void; onSaved: () => void }) {
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
          alert(`Movimiento registrado. Alerta: "${product.name}" tiene stock bajo (${newStock} unidades)`);
        } else {
          alert("Movimiento registrado correctamente");
        }
        onSaved();
        onClose();
      }
    } catch (err) {
      alert("Error al registrar movimiento");
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
          <label className="block text-sm font-medium text-foreground mb-2">Cantidad</label>
          <input
            type="number"
            min={1}
            value={qty || ""}
            onChange={(e) => setQty(parseInt(e.target.value) || 0)}
            placeholder="0"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Nota (opcional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej: Compra semanal"
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="ghost" onClick={onClose} className="flex-1">Cancelar</Button>
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

  const stockStatus = (stock: number) => {
    if (stock === 0) return { label: "Sin stock", variant: "danger" as const };
    if (stock <= 5) return { label: "Stock bajo", variant: "warning" as const };
    return { label: "Normal", variant: "success" as const };
  };

  return (
    <div className="space-y-6">
      {stockModal && (
        <StockModal
          product={stockModal.product}
          type={stockModal.type}
          onClose={() => setStockModal(null)}
          onSaved={async () => {
            const productsRes = await fetch("/api/admin/products", { credentials: "include" });
            const productsData = await productsRes.json();
            setProducts(productsData.products || []);
          }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Inventario</h1>
          <p className="text-sm text-muted-foreground mt-1">Controla el stock y los movimientos de cada producto</p>
        </div>
      </div>

      {/* Stock Table */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="font-display text-xl text-foreground">Stock por producto</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4 font-medium text-left">Producto</th>
                <th className="px-6 py-4 font-medium text-left">Presentación</th>
                <th className="px-6 py-4 font-medium text-right">Stock</th>
                <th className="px-6 py-4 font-medium text-center">Estado</th>
                <th className="px-6 py-4 font-medium text-right">Acciones</th>
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
                      <Badge variant={status.variant} size="sm">{status.label}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStockModal({ product: p, type: "entrada" })}
                          className="gap-1.5"
                        >
                          <ArrowUp className="size-3.5" />
                          Entrada
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setStockModal({ product: p, type: "salida" })}
                          className="gap-1.5 text-danger hover:text-danger"
                        >
                          <ArrowDown className="size-3.5" />
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

      {/* Movements Table */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <h2 className="font-display text-xl text-foreground">Movimientos recientes</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-3.5 font-medium text-left">Fecha</th>
              <th className="px-6 py-3.5 font-medium text-left">Producto</th>
              <th className="px-6 py-3.5 font-medium text-left">Tipo</th>
              <th className="px-6 py-3.5 font-medium text-right">Cantidad</th>
              <th className="px-6 py-3.5 font-medium text-left">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {movements.map((m) => (
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