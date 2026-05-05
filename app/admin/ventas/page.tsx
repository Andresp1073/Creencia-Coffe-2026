"use client";

import { useState, useEffect } from "react";
import { Plus, Eye, X, Trash2 } from "lucide-react";
import { formatCOP } from "@/lib/utils";

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

export default function AdminSalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<Sale | null>(null);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState("");

  useEffect(() => {
    fetchSales();
    fetchProducts();
  }, []);

  const fetchSales = async () => {
    try {
      const res = await fetch("/api/admin/sales", { credentials: "include" });
      const data = await res.json();
      if (data.sales) {
        setSales(data.sales);
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/admin/products", { credentials: "include" });
      const data = await res.json();
      if (data.products) {
        setProducts(data.products.filter((p: Product) => p.active && p.stock > 0));
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const addItem = (product: Product) => {
    const pres = product.presentation || '500g';
    const presLabel = pres === '500g' ? '500grs' : pres === '250g' ? '250grs' : '125grs';
    setItems([...items, {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      price: product.price,
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

  const handleSubmit = async () => {
    if (!customer.trim()) {
      alert("Por favor ingresa el nombre del cliente");
      return;
    }
    if (items.length === 0) {
      alert("Agrega al menos un producto");
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

      if (!res.ok) {
        const err = await res.json();
        alert("Error: " + (err.error || "Error al guardar"));
        setSaving(false);
        return;
      }

      const data = await res.json();
      
      const newSale: Sale = {
        id: data.id || Date.now(),
        date: new Date().toISOString(),
        customer: customer,
        items: saleItems,
        total: total
      };

      const newSalesList = [
        newSale,
        ...sales
      ];
      setSales(newSalesList);

      for (const item of items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const newStock = (product.stock || 0) - item.quantity;
          
          console.log("Updating stock for:", product.name, "newStock:", newStock);
          
          try {
            const stockRes = await fetch("/api/admin/products", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                id: item.productId,
                stock: newStock
              })
            });
            console.log("Stock update response:", stockRes.status);
          } catch (stockError) {
            console.error("Stock update error:", stockError);
          }

          console.log("Checking notification for stock:", newStock, "threshold:", 5);
          
          if (newStock > 0 && newStock <= 5) {
            console.log("Creating notification for:", product.name, "stock:", newStock);
            
            try {
              const notifRes = await fetch("/api/admin/notifications/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  type: "warning",
                  title: `Stock bajo: ${product.name}`,
                  message: `El producto "${product.name}" tiene ${newStock} unidades en stock`
                })
              });
              const notifData = await notifRes.json();
              console.log("Notification response:", notifRes.status, notifData);

              if (notifRes.ok) {
                console.log("Notification created successfully!");
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new Event("notifications:update"));
                }
                await fetch("/api/admin/notifications/email", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    to: "andresmauriciope1073@gmail.com",
                    subject: `Alerta de Stock - ${product.name}`,
                    message: `El producto "${product.name}" tiene stock bajo: ${newStock} unidades.`
                  })
                });
              }
            } catch (notifError) {
              console.error("Notification error:", notifError);
            }
          }
        }
      }

      setShowModal(false);
      setItems([]);
      setCustomer("");
      alert("Venta registrada exitosamente");
    } catch (error) {
      console.error("Error saving sale:", error);
      alert("Error al registrar venta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl">Ventas</h1>
          <p className="text-muted-foreground mt-1">Registra y consulta los pedidos de tus clientes</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-coffee-dark text-white text-sm font-medium shadow-soft hover:shadow-warm transition-smooth"
        >
          <Plus className="size-4" /> Nueva venta
        </button>
      </div>

      <div className="bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground border-b border-border/50 bg-muted/30">
              <th className="px-6 py-3.5 font-normal">N°</th>
              <th className="px-6 py-3.5 font-normal">Fecha</th>
              <th className="px-6 py-3.5 font-normal">Cliente</th>
              <th className="px-6 py-3.5 font-normal text-right">Productos</th>
              <th className="px-6 py-3.5 font-normal text-right">Total</th>
              <th className="px-6 py-3.5 font-normal text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-6 py-4 font-medium text-coffee-dark">{s.id}</td>
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
                  {s.items.reduce((a, i) => a + i.qty, 0)} unid
                </td>
                <td className="px-6 py-4 text-right font-medium text-coffee-dark">
                  {formatCOP(s.total)}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowDetail(s)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-foreground/70 hover:bg-muted transition-smooth"
                    >
                      <Eye className="size-3.5" /> Ver
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-coffee-dark/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
          <div className="bg-background w-full max-w-2xl rounded-3xl shadow-elevated overflow-hidden">
            <div className="px-8 py-6 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-display text-2xl">Nueva venta</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Selecciona productos y cantidades
                </p>
              </div>
              <button
                onClick={() => { setShowModal(false); setItems([]); setCustomer(""); }}
                className="size-9 rounded-full hover:bg-muted flex items-center justify-center transition-smooth"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <div className="mb-6">
                <label className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  Cliente
                </label>
                <input
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-smooth"
                />
              </div>

              <div className="space-y-3">
                <label className="block text-xs uppercase tracking-[0.14em] text-muted-foreground mb-2">
                  Productos
                </label>
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const product = products.find(p => p.id === Number(e.target.value));
                        if (product) {
                          const newItems = [...items];
                          const pres = product.presentation || '500g';
                          const presLabel = pres === '500g' ? '500grs' : pres === '250g' ? '250grs' : '125grs';
                          newItems[idx] = {
                            ...newItems[idx],
                            productId: product.id,
                            productName: product.name,
                            price: product.price,
                            presentation: presLabel
                          };
                          setItems(newItems);
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-coffee-medium"
                    >
                      {products.map((pp) => {
                        const pres = pp.presentation || '500g';
                        const presLabel = pres === '500g' ? '500grs' : pres === '250g' ? '250grs' : '125grs';
                        return (
                          <option key={pp.id} value={pp.id}>
                            {pp.name} {presLabel} ({pp.stock} disponibles)
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
                          newItems[idx] = {
                            ...newItems[idx],
                            presentation: pres,
                            price: pres === '500grs' ? (product.price_500g || product.price) : 
                                   pres === '250grs' ? (product.price_250g || product.price) :
                                   (product.price_125g || product.price)
                          };
                          setItems(newItems);
                        }
                      }}
                      className="w-28 px-2 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-coffee-medium"
                    >
                      <option value="500grs">500grs</option>
                      <option value="250grs">250grs</option>
                      <option value="125grs">125grs</option>
                    </select>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                      className="w-20 px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-coffee-medium text-center"
                    />
                    <div className="w-28 text-right text-sm font-medium text-coffee-dark">
                      {formatCOP(item.price * item.quantity)}
                    </div>
                    <button
                      onClick={() => removeItem(idx)}
                      disabled={items.length === 1}
                      className="size-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-red-500 disabled:opacity-30 transition-smooth"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    if (products.length > 0) {
                      addItem(products[0]);
                    }
                  }}
                  disabled={products.length === 0}
                  className="w-full py-2.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-coffee-medium hover:text-coffee-dark transition-smooth flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Plus className="size-4" /> Agregar producto
                </button>
              </div>
            </div>

            <div className="px-8 py-6 border-t border-border bg-muted/30 flex items-center justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Total
                </div>
                <div className="font-display text-3xl text-coffee-dark">
                  {formatCOP(total)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setShowModal(false); setItems([]); setCustomer(""); }}
                  className="px-5 py-2.5 rounded-full text-sm text-foreground/70 hover:bg-muted transition-smooth"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-full bg-coffee-dark text-white text-sm font-medium shadow-soft hover:shadow-warm transition-smooth disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Registrar venta"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="fixed inset-0 z-50 bg-coffee-dark/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
          <div className="bg-background w-full max-w-md rounded-3xl shadow-elevated overflow-hidden">
            <div className="px-7 py-5 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl">Venta {showDetail.id}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{showDetail.customer}</p>
              </div>
              <button
                onClick={() => setShowDetail(null)}
                className="size-9 rounded-full hover:bg-muted flex items-center justify-center transition-smooth"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-7 space-y-3">
              {showDetail.items.length > 0 ? showDetail.items.map((it: any, i: number) => {
                const product = products.find(p => String(p.id) === String(it.id));
                const unitPrice = it.price || product?.price_500g || product?.price || 0;
                const productName = it.name || product?.name || "Producto";
                const presentation = it.presentation || product?.presentation || "";
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{productName}</div>
                      <div className="text-xs text-muted-foreground">
                        {presentation} · {it.qty} × {formatCOP(unitPrice)}
                      </div>
                    </div>
                    <div className="font-medium">
                      {formatCOP((it.qty || 0) * unitPrice)}
                    </div>
                  </div>
                );
              }) : (
                <div className="text-muted-foreground text-sm">Venta sin items registrados</div>
              )}
            </div>
            <div className="px-7 py-5 border-t border-border bg-muted/30 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-display text-2xl text-coffee-dark">
                {formatCOP(showDetail.total)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}