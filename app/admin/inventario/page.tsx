"use client";

import { useState, useEffect } from "react";
import { ArrowUp, ArrowDown, X } from "lucide-react";

interface Product {
  id: number;
  name: string;
  presentation: string;
  stock: number;
  stock_min?: number;
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

function StockModal({ product, type, onClose, onSaved }: { product: Product; type: "entrada" | "salida"; onClose: () => void; onSaved: () => void }) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (qty <= 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          stock: type === "entrada" 
            ? (product.stock || 0) + qty 
            : Math.max(0, (product.stock || 0) - qty)
        })
      });

      if (res.ok) {
        const newStock = type === "entrada" 
          ? (product.stock || 0) + qty 
          : Math.max(0, (product.stock || 0) - qty);
        
        if (type === "salida" && newStock <= 5) {
          alert(`Movimiento registrado. ⚠️ Alerta: "${product.name}" tiene stock bajo (${newStock} unidades)`);
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
    <div className="fixed inset-0 z-50 bg-coffee-dark/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
      <div className="bg-background w-full max-w-sm rounded-3xl shadow-elevated overflow-hidden">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-display text-lg">
            {type === "entrada" ? "Entrada de stock" : "Salida de stock"}
          </h3>
          <button onClick={onClose} className="size-8 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="size-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="text-sm text-muted-foreground">
            Producto: <span className="font-medium text-foreground">{product.name} - {product.presentation}</span>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Cantidad</label>
            <input
              type="number"
              min={1}
              value={qty || ""}
              onChange={(e) => setQty(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">Nota (opcional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej: Compra semanal"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none"
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || qty <= 0}
            className="w-full py-2.5 rounded-xl bg-coffee-dark text-white text-sm font-medium shadow-soft hover:shadow-warm transition-smooth disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Registrar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [stockModal, setStockModal] = useState<{ product: Product; type: "entrada" | "salida" } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const productsRes = await fetch("/api/admin/products");
      const productsData = await productsRes.json();
      setProducts(productsData.products || []);
      
      setMovements([
        { id: 1, date: "2026-05-03", product_name: "Café Tostado Medio 500g", type: "entrada", qty: 20, note: "Compra proveedor" },
        { id: 2, date: "2026-05-02", product_name: "Café Suave 250g", type: "salida", qty: 5, note: "Venta" },
        { id: 3, date: "2026-05-01", product_name: "Café Molido 125g", type: "entrada", qty: 30, note: "Compra proveedor" },
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const stockStatus = (stock: number) => {
    if (stock === 0) return { label: "Sin stock", variant: "danger" };
    if (stock <= 5) return { label: "Stock bajo", variant: "warning" };
    return { label: "Normal", variant: "success" };
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-coffee-dark"></div>
      </div>
    );
  }

  return (
    <div>
      {stockModal && (
        <StockModal
          product={stockModal.product}
          type={stockModal.type}
          onClose={() => setStockModal(null)}
          onSaved={() => fetchData()}
        />
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl">Inventario</h1>
          <p className="text-muted-foreground mt-1">Controla el stock y los movimientos de cada producto</p>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-border/50">
          <h2 className="font-display text-xl">Stock por producto</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground border-b border-border/50">
                <th className="px-6 py-3 font-normal">Producto</th>
                <th className="px-6 py-3 font-normal">Presentación</th>
                <th className="px-6 py-3 font-normal text-right">Stock</th>
                <th className="px-6 py-3 font-normal text-center">Estado</th>
                <th className="px-6 py-3 font-normal text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const status = stockStatus(p.stock || 0);
                return (
                  <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium">{p.name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{p.presentation}</td>
                    <td className="px-6 py-4 text-right tabular-nums font-medium">{p.stock || 0}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                        status.variant === "danger" ? "bg-red-100 text-red-700" :
                        status.variant === "warning" ? "bg-amber-100 text-amber-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setStockModal({ product: p, type: "entrada" })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-green-100 text-green-700 hover:bg-green-200 transition-smooth"
                        >
                          <ArrowUp className="size-3.5" /> Entrada
                        </button>
                        <button
                          onClick={() => setStockModal({ product: p, type: "salida" })}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs bg-amber-100 text-amber-700 hover:bg-amber-200 transition-smooth"
                        >
                          <ArrowDown className="size-3.5" /> Salida
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-border/50">
          <h2 className="font-display text-xl">Movimientos recientes</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground border-b border-border/50">
              <th className="px-6 py-3 font-normal">Fecha</th>
              <th className="px-6 py-3 font-normal">Producto</th>
              <th className="px-6 py-3 font-normal">Tipo</th>
              <th className="px-6 py-3 font-normal text-right">Cantidad</th>
              <th className="px-6 py-3 font-normal">Nota</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((m) => (
              <tr key={m.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                <td className="px-6 py-4 text-muted-foreground">{m.date}</td>
                <td className="px-6 py-4 font-medium">{m.product_name}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    m.type === "entrada" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {m.type === "entrada" ? "Entrada" : "Salida"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-medium">{m.qty}</td>
                <td className="px-6 py-4 text-muted-foreground text-xs">{m.note || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}