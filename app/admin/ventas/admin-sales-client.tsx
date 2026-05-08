"use client";

import { useState } from "react";
import { Plus, Eye, X, Trash2, CheckCircle, AlertCircle } from "lucide-react";
import { formatCOP } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface Product {
  id: number;
  name: string;
  price: number;
  price_500g?: number;
  price_250g?: number;
  price_125g?: number;
  stock: number;
  presentation: string;
  active?: boolean;
}

interface SaleItem {
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  presentation: string;
}

interface Sale {
  id: number;
  date: string;
  customer: string;
  items: { id: string; qty: number; price?: number; name?: string; presentation?: string }[];
  total: number;
}

interface Props {
  initialSales: Sale[];
  initialProducts: Product[];
}

interface Toast {
  message: string;
  type: "success" | "error";
}

export function AdminSalesClient({ initialSales, initialProducts }: Props) {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [products] = useState<Product[]>(initialProducts);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<Sale | null>(null);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const addItem = (product: Product) => {
    if (product.stock <= 0) {
      showToast(`${product.name} no tiene stock disponible`, "error");
      return;
    }
    const pres = product.presentation || '500g';
    const presLabel = pres === '500g' ? '500grs' : pres === '250g' ? '250grs' : '125grs';
    const basePrice = product.price_500g || product.price || 0;
    setItems([...items, {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      price: basePrice,
      presentation: presLabel
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, quantity);
    setItems(newItems);
  };

  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const fetchSales = async () => {
    try {
      const res = await fetch("/api/admin/sales", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
    }
  };

  const handleSubmit = async () => {
    if (!customer.trim()) {
      showToast("Por favor ingresa el nombre del cliente", "error");
      return;
    }
    if (items.length === 0) {
      showToast("Agrega al menos un producto", "error");
      return;
    }

    const stockErrors: string[] = [];
    for (const item of items) {
      const product = products.find(p => p.id === item.productId);
      if (product && product.stock < item.quantity) {
        stockErrors.push(`${product.name}: solo ${product.stock} disponibles`);
      }
    }
    if (stockErrors.length > 0) {
      showToast("Stock insuficiente:\n" + stockErrors.join("\n"), "error");
      return;
    }

    setSaving(true);
    try {
      const saleItems = items.map(i => ({ 
        id: String(i.productId), 
        qty: i.quantity,
        price: i.price,
        name: i.productName,
        presentation: i.presentation
      }));

      const res = await fetch("/api/admin/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer: customer,
          total: total,
          items: saleItems
        })
      });

      const data = await res.json();

      if (!res.ok) {
        let errorMsg = data.error || "Error al guardar";
        if (data.details && data.details.length > 0) {
          errorMsg = data.details.join("\n");
        }
        showToast(errorMsg, "error");
        setSaving(false);
        return;
      }

      showToast(data.message || "Venta registrada exitosamente", "success");
      setShowModal(false);
      setItems([]);
      setCustomer("");
      await fetchSales();
      window.dispatchEvent(new Event("notifications:update"));
    } catch (error) {
      console.error("Error saving sale:", error);
      showToast("Error al registrar venta", "error");
    } finally {
      setSaving(false);
    }
  };

  const getUnitPrice = (item: any, saleTotal: number, saleItems: any[]) => {
    if (item.price && item.price > 0) return item.price;
    const product = products.find(p => Number(p.id) === Number(item.id));
    if (product) {
      const basePrice = product.price_500g || product.price || 0;
      if (basePrice > 0) return basePrice;
    }
    const totalQty = saleItems.reduce((sum: number, i: any) => sum + (i.qty || 0), 0);
    return totalQty > 0 ? Math.round(saleTotal / totalQty) : 0;
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-elevated animate-slide-in-right ${
          toast.type === "success" ? "bg-success text-white" : "bg-danger text-white"
        }`}>
          {toast.type === "success" ? <CheckCircle className="size-5" /> : <AlertCircle className="size-5" />}
          <span className="text-sm font-medium whitespace-pre-line">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Ventas</h1>
          <p className="text-sm text-muted-foreground mt-1">Registra y consulta los pedidos de tus clientes</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="md">
          <Plus className="size-4" />
          Nueva venta
        </Button>
      </div>

      {/* Sales Table */}
      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4 font-medium text-left">N°</th>
              <th className="px-6 py-4 font-medium text-left">Fecha</th>
              <th className="px-6 py-4 font-medium text-left">Cliente</th>
              <th className="px-6 py-4 font-medium text-right">Productos</th>
              <th className="px-6 py-4 font-medium text-right">Total</th>
              <th className="px-6 py-4 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                  No hay ventas registradas
                </td>
              </tr>
            ) : sales.map((s) => (
              <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-medium text-brand-caramel">#{s.id}</td>
                <td className="px-6 py-4 text-muted-foreground">
                  {new Date(s.date).toLocaleString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-6 py-4 font-medium">{s.customer}</td>
                <td className="px-6 py-4 text-right text-muted-foreground">
                  {s.items.reduce((a, i) => a + (i.qty || 0), 0)} unid
                </td>
                <td className="px-6 py-4 text-right font-medium text-foreground">
                  {formatCOP(s.total)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetail(s)}
                    >
                      <Eye className="size-4" />
                      Ver
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Sale Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-coffee-dark/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-background rounded-2xl shadow-elevated w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h2 className="font-display text-xl text-foreground">Nueva venta</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Selecciona productos y cantidades</p>
              </div>
              <button
                onClick={() => { setShowModal(false); setItems([]); setCustomer(""); }}
                className="size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Cliente</label>
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-foreground">Productos</label>
                
                {items.map((item, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border bg-muted/30">
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const product = products.find(p => p.id === Number(e.target.value));
                        if (product) {
                          const newItems = [...items];
                          const pres = product.presentation || '500g';
                          const presLabel = pres === '500g' ? '500grs' : pres === '250g' ? '250grs' : '125grs';
                          const basePrice = product.price_500g || product.price || 0;
                          newItems[idx] = {
                            ...newItems[idx],
                            productId: product.id,
                            productName: product.name,
                            price: basePrice,
                            presentation: presLabel
                          };
                          setItems(newItems);
                        }
                      }}
                      className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-coffee-medium transition-all"
                    >
                      {products.map((pp) => {
                        const pres = pp.presentation || '500g';
                        const presLabel = pres === '500g' ? '500grs' : pres === '250g' ? '250grs' : '125grs';
                        const isOutOfStock = pp.stock <= 0;
                        return (
                          <option key={pp.id} value={pp.id} disabled={isOutOfStock}>
                            {pp.name} {presLabel} ({isOutOfStock ? "Sin stock" : `${pp.stock} disp.`})
                          </option>
                        );
                      })}
                    </select>
                    
                    <select
                      value={item.presentation}
                      onChange={(e) => {
                        const product = products.find(p => p.id === item.productId);
                        if (product) {
                          const newItems = [...items];
                          const pres = e.target.value;
                          const basePrice = pres === '500grs' ? (product.price_500g || product.price) : 
                                          pres === '250grs' ? (product.price_250g || Math.round(product.price * 0.55)) :
                                          (product.price_125g || Math.round(product.price * 0.3));
                          newItems[idx] = { ...newItems[idx], presentation: pres, price: basePrice };
                          setItems(newItems);
                        }
                      }}
                      className="w-24 px-2 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-coffee-medium transition-all"
                    >
                      <option value="500grs">500grs</option>
                      <option value="250grs">250grs</option>
                      <option value="125grs">125grs</option>
                    </select>
                    
                    <input
                      type="number"
                      min="1"
                      max="999"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-2 rounded-lg bg-background border border-border text-sm text-center outline-none focus:border-coffee-medium transition-all"
                    />
                    
                    <div className="w-24 text-right text-sm font-medium text-foreground">
                      {formatCOP(item.price * item.quantity)}
                    </div>
                    
                    <button
                      onClick={() => removeItem(idx)}
                      className="size-8 rounded-lg hover:bg-danger/10 flex items-center justify-center text-danger transition-colors"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => {
                    const inStockProducts = products.filter(p => p.stock > 0);
                    if (inStockProducts.length > 0) addItem(inStockProducts[0]);
                  }}
                  disabled={products.filter(p => p.stock > 0).length === 0}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-coffee-medium hover:text-coffee-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus className="size-4" />
                  {products.filter(p => p.stock > 0).length === 0 ? "Sin productos disponibles" : "Agregar producto"}
                </button>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-border bg-muted/30 flex items-center justify-between gap-4 shrink-0">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="font-display text-2xl text-foreground">{formatCOP(total)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={() => { setShowModal(false); setItems([]); setCustomer(""); }}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} loading={saving}>
                  Registrar venta
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sale Detail Modal */}
      {showDetail && (
        <Modal
          isOpen={true}
          onClose={() => setShowDetail(null)}
          title={`Venta #${showDetail.id}`}
          description={showDetail.customer}
          size="md"
        >
          <div className="space-y-4">
            {showDetail.items.length > 0 ? showDetail.items.map((it: any, i: number) => {
              const unitPrice = getUnitPrice(it, showDetail.total, showDetail.items);
              const productName = it.name || "Producto";
              const presentation = it.presentation || "";
              return (
                <div key={i} className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
                  <div>
                    <p className="font-medium text-foreground">{productName}</p>
                    <p className="text-sm text-muted-foreground">
                      {presentation} · {it.qty} × {formatCOP(unitPrice)}
                    </p>
                  </div>
                  <p className="font-medium text-foreground">
                    {formatCOP((it.qty || 0) * unitPrice)}
                  </p>
                </div>
              );
            }) : (
              <p className="text-center text-muted-foreground py-4">Venta sin items registrados</p>
            )}
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="font-display text-2xl text-foreground">{formatCOP(showDetail.total)}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}