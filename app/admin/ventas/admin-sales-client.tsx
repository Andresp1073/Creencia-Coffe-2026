"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { Plus, Eye, X, Trash2, CheckCircle, AlertCircle, FileText, RefreshCw } from "lucide-react";
import { toast as sonnerToast } from "sonner";
import { formatCOP } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PAYMENT_FORMS, PAYMENT_METHODS } from "@/lib/factus/payment";

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
  customer_id?: number | null;
  payment_form?: string | null;
  payment_method_code?: string | null;
  payment_reference?: string | null;
  payment_due_date?: string | null;
}

interface Props {
  initialSales: Sale[];
  initialProducts: Product[];
}

interface Toast {
  message: string;
  type: "success" | "error";
}

const DOCUMENT_CODES = [
  { code: "31", label: "NIT" },
  { code: "13", label: "Cédula de ciudadanía" },
  { code: "22", label: "Cédula de extranjería" },
  { code: "41", label: "Pasaporte" },
  { code: "50", label: "NIT de otro país" },
];

const defaultCustomerForm = {
  legal: "2",
  docCode: "13",
  identification: "",
  dv: "",
  company: "",
  names: "",
  tradeName: "",
  address: "",
  email: "",
  phone: "",
  countryCode: "CO",
  municipalityCode: "",
};

type CustomerForm = typeof defaultCustomerForm;

function InvoiceAction({ status, onInvoice }: { status: string; onInvoice: () => void }) {
  if (status === "validated") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success">
        <CheckCircle className="size-3.5" aria-hidden="true" />
        Facturada
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
        Procesando
      </span>
    );
  }
  if (status === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
        Cancelada
      </span>
    );
  }
  return (
    <Button variant="ghost" size="sm" onClick={onInvoice} aria-label="Reintentar facturación">
      <RefreshCw className="size-4" aria-hidden="true" />
      {status === "failed" ? "Reintentar" : "Generar"}
    </Button>
  );
}

export function AdminSalesClient({ initialSales, initialProducts }: Props) {
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [products] = useState<Product[]>(initialProducts);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<Sale | null>(null);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [customer, setCustomer] = useState("");
  const [paymentForm, setPaymentForm] = useState("1");
  const [paymentMethodCode, setPaymentMethodCode] = useState("10");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDueDate, setPaymentDueDate] = useState("");
  const [showInvoice, setShowInvoice] = useState<Sale | null>(null);
  const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [invoiceByOrder, setInvoiceByOrder] = useState<Record<number, { status: string; id: number }>>({});
  const [custForm, setCustForm] = useState<CustomerForm>(defaultCustomerForm);
  const [toast, setToast] = useState<Toast | null>(null);

  const inStockProducts = useMemo(() => 
    products.filter(p => p.stock > 0), 
    [products]
  );

  const selectedPaymentMethod = useMemo(
    () => PAYMENT_METHODS.find(m => m.code === paymentMethodCode),
    [paymentMethodCode]
  );

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const addItem = useCallback((product: Product) => {
    if (product.stock <= 0) {
      showToast(`${product.name} no tiene stock disponible`, "error");
      return;
    }
    const pres = product.presentation || '500g';
    const presLabel = pres === '500g' ? '500grs' : pres === '250g' ? '250grs' : '125grs';
    const basePrice = product.price_500g || product.price || 0;
    setItems(prev => [...prev, {
      productId: product.id,
      productName: product.name,
      quantity: 1,
      price: basePrice,
      presentation: presLabel
    }]);
  }, [showToast]);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], quantity: Math.max(1, quantity) };
      return newItems;
    });
  }, []);

  const total = useMemo(() => 
    items.reduce((sum, item) => sum + (item.price * item.quantity), 0), 
    [items]
  );

  const fetchSales = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sales", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
      }
    } catch (error) {
      console.error("Error fetching sales:", error);
    }
  }, []);

  const fetchInvoices = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/invoices", { credentials: "include", cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const map: Record<number, { status: string; id: number }> = {};
        for (const inv of data.invoices || []) {
          if (inv.order_id) map[Number(inv.order_id)] = { status: inv.status, id: Number(inv.id) };
        }
        setInvoiceByOrder(map);
      }
    } catch (error) {
      console.error("Error fetching invoices:", error);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const updateItemProduct = useCallback((idx: number, productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const pres = product.presentation || '500g';
      const presLabel = pres === '500g' ? '500grs' : pres === '250g' ? '250grs' : '125grs';
      const basePrice = product.price_500g || product.price || 0;
      setItems(prev => prev.map((item, i) => i === idx ? {
        ...item,
        productId: product.id,
        productName: product.name,
        price: basePrice,
        presentation: presLabel
      } : item));
    }
  }, [products]);

  const updateItemPresentation = useCallback((idx: number, presentation: string) => {
    const item = items[idx];
    if (!item) return;
    const product = products.find(p => p.id === item.productId);
    if (product) {
      let basePrice: number;
      if (presentation === '500grs') {
        basePrice = product.price_500g || product.price;
      } else if (presentation === '250grs') {
        basePrice = product.price_250g || Math.round(product.price * 0.55);
      } else {
        basePrice = product.price_125g || Math.round(product.price * 0.3);
      }
      setItems(prev => prev.map((item, i) => i === idx ? { ...item, presentation, price: basePrice } : item));
    }
  }, [items, products]);

  const resetForm = useCallback(() => {
    setShowModal(false);
    setItems([]);
    setCustomer("");
    setPaymentForm("1");
    setPaymentMethodCode("10");
    setPaymentReference("");
    setPaymentDueDate("");
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!customer.trim()) {
      showToast("Por favor ingresa el nombre del cliente", "error");
      return;
    }
    if (items.length === 0) {
      showToast("Agrega al menos un producto", "error");
      return;
    }
    if (!paymentForm) {
      showToast("Selecciona la forma de pago", "error");
      return;
    }
    if (!paymentMethodCode) {
      showToast("Selecciona el método de pago", "error");
      return;
    }
    if (selectedPaymentMethod?.requiresReference && !paymentReference.trim()) {
      showToast("Ingresa la referencia de pago", "error");
      return;
    }
    if (paymentForm === "2" && !paymentDueDate) {
      showToast("Para crédito (payment_form=2) ingresa la fecha de vencimiento", "error");
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
          items: saleItems,
          payment_form: paymentForm,
          payment_method_code: paymentMethodCode,
          payment_reference: selectedPaymentMethod?.requiresReference ? paymentReference.trim() : undefined,
          payment_due_date: paymentForm === "2" ? paymentDueDate : undefined,
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
      resetForm();
      await fetchSales();
      window.dispatchEvent(new Event("notifications:update"));
    } catch (error) {
      console.error("Error saving sale:", error);
      showToast("Error al registrar venta", "error");
    } finally {
      setSaving(false);
    }
  }, [customer, items, products, showToast, total, resetForm, fetchSales, selectedPaymentMethod, paymentForm, paymentMethodCode, paymentReference, paymentDueDate]);

  const getUnitPrice = useCallback((item: any, saleTotal: number, saleItems: any[]) => {
    if (item.price && item.price > 0) return item.price;
    const product = products.find(p => Number(p.id) === Number(item.id));
    if (product) {
      const basePrice = product.price_500g || product.price || 0;
      if (basePrice > 0) return basePrice;
    }
    const totalQty = saleItems.reduce((sum: number, i: any) => sum + (i.qty || 0), 0);
    return totalQty > 0 ? Math.round(saleTotal / totalQty) : 0;
  }, [products]);

  const openInvoiceModal = useCallback(async (sale: Sale) => {
    setShowInvoice(sale);
    setCustForm({ ...defaultCustomerForm });
    try {
      const res = await fetch(`/api/admin/invoices/${sale.id}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        const inv = data.invoice;
        if (inv?.customer_snapshot) {
          const snap = typeof inv.customer_snapshot === "string" ? JSON.parse(inv.customer_snapshot) : inv.customer_snapshot;
          if (snap && typeof snap === "object") {
            setCustForm({
              legal: String(snap.legal_organization_code || "2"),
              docCode: String(snap.identification_document_code || "13"),
              identification: String(snap.identification || ""),
              dv: String(snap.dv || ""),
              company: String(snap.company || ""),
              names: String(snap.names || ""),
              tradeName: String(snap.trade_name || ""),
              address: String(snap.address || ""),
              email: String(snap.email || ""),
              phone: String(snap.phone || ""),
              countryCode: "CO",
              municipalityCode: String(snap.municipality_code || ""),
            });
          }
        }
      }
    } catch (error) {
      console.error("Error loading existing invoice:", error);
    }
  }, []);

  const handleGenerateInvoice = useCallback(async () => {
    if (!showInvoice) return;
    const docCode = custForm.docCode.trim();
    const identification = custForm.identification.trim();
    if (!docCode || !identification) {
      sonnerToast.error("Requerimos el tipo y número de identificación del cliente");
      return;
    }
    if (custForm.legal === "1" && !custForm.company.trim()) {
      sonnerToast.error("Para persona jurídica se requiere la razón social (company)");
      return;
    }
    if (custForm.legal === "2" && !custForm.names.trim()) {
      sonnerToast.error("Para persona natural se requiere el nombre (names)");
      return;
    }

    const isCredit = showInvoice.payment_form === "2";
    if (isCredit && !showInvoice.payment_due_date) {
      sonnerToast.error("La venta es a crédito y requiere fecha de vencimiento. Edita la venta antes de facturar.");
      return;
    }

    setInvoiceBusy(true);
    try {
      const res = await fetch(`/api/admin/invoices/${showInvoice.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          customer: {
            identification_document_code: docCode,
            identification: identification,
            dv: custForm.legal === "1" && custForm.dv.trim() ? custForm.dv.trim() : null,
            legal_organization_code: custForm.legal,
            company: custForm.legal === "1" ? custForm.company.trim() : null,
            trade_name: custForm.tradeName.trim() || null,
            names: custForm.legal === "2" ? custForm.names.trim() : null,
            address: custForm.address.trim() || null,
            email: custForm.email.trim() || null,
            phone: custForm.phone.trim() || null,
            country_code: "CO",
            municipality_code: custForm.municipalityCode.trim() || null,
          },
          payment: {
            payment_form: showInvoice.payment_form || undefined,
            payment_method_code: showInvoice.payment_method_code || undefined,
            payment_reference: showInvoice.payment_reference || undefined,
            payment_due_date: isCredit ? showInvoice.payment_due_date || undefined : undefined,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        sonnerToast.error(data.error || "No se pudo generar la factura");
        return;
      }

      const next = data.invoice as { status?: string; number?: string | null } | undefined;
      if (next?.status === "processing") {
        sonnerToast.warning("Factura en procesamiento. No se reenviará automáticamente para evitar duplicados.");
      } else if (next?.status === "validated") {
        sonnerToast.success(data.message || `Factura ${next.number} validada y enviada a DIAN`);
      } else {
        sonnerToast.success(data.message || "Factura generada");
      }
      setShowInvoice(null);
      await fetchSales();
      await fetchInvoices();
    } catch (error) {
      console.error("Error generating invoice:", error);
      sonnerToast.error("Error al generar la factura");
    } finally {
      setInvoiceBusy(false);
    }
  }, [showInvoice, custForm, fetchSales, fetchInvoices]);

  return (
    <div className="space-y-6">
      {toast && (
        <div 
          role="alert"
          aria-live="polite"
          className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-elevated animate-slide-in-right ${
            toast.type === "success" ? "bg-success text-white" : "bg-danger text-white"
          }`}>
          {toast.type === "success" ? <CheckCircle className="size-5" aria-hidden="true" /> : <AlertCircle className="size-5" aria-hidden="true" />}
          <span className="text-sm font-medium whitespace-pre-line">{toast.message}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Ventas</h1>
          <p className="text-sm text-muted-foreground mt-1">Registra y consulta los pedidos de tus clientes</p>
        </div>
        <Button onClick={() => setShowModal(true)} size="md" aria-label="Registrar nueva venta">
          <Plus className="size-4" aria-hidden="true" />
          Nueva venta
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden" role="region" aria-label="Lista de ventas">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-6 py-4 font-medium text-left" scope="col">N°</th>
              <th className="px-6 py-4 font-medium text-left" scope="col">Fecha</th>
              <th className="px-6 py-4 font-medium text-left" scope="col">Cliente</th>
              <th className="px-6 py-4 font-medium text-right" scope="col">Productos</th>
              <th className="px-6 py-4 font-medium text-right" scope="col">Total</th>
              <th className="px-6 py-4 font-medium text-right" scope="col">Acciones</th>
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
                <td className="px-6 py-4 font-medium text-brand-caramel">{s.id}</td>
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
                  <div className="flex justify-end items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowDetail(s)}
                      aria-label={`Ver detalles de venta #${s.id}`}
                    >
                      <Eye className="size-4" aria-hidden="true" />
                      Ver
                    </Button>
                    {invoiceByOrder[s.id] ? (
                      <InvoiceAction
                        status={invoiceByOrder[s.id].status}
                        onInvoice={() => openInvoiceModal(s)}
                      />
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openInvoiceModal(s)}
                        aria-label={`Generar factura de la venta #${s.id}`}
                      >
                        <FileText className="size-4" aria-hidden="true" />
                        Generar factura
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="new-sale-title">
          <div 
            className="absolute inset-0 bg-coffee-dark/50 backdrop-blur-sm" 
            onClick={resetForm}
            aria-hidden="true"
          />
          <div className="relative bg-background rounded-2xl shadow-elevated w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-scale-in">
            <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h2 id="new-sale-title" className="font-display text-xl text-foreground">Nueva venta</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Selecciona productos y cantidades</p>
              </div>
              <button
                onClick={resetForm}
                className="size-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel"
                aria-label="Cerrar modal"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <label htmlFor="customer-name" className="block text-sm font-medium text-foreground mb-2">Cliente</label>
                <input
                  id="customer-name"
                  type="text"
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                  placeholder="Nombre del cliente"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
                  required
                />
              </div>

              <fieldset>
                <legend className="block text-sm font-medium text-foreground mb-3">Datos de pago</legend>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="payment-form" className="block text-sm font-medium text-foreground mb-2">Forma de pago</label>
                    <select
                      id="payment-form"
                      value={paymentForm}
                      onChange={(e) => setPaymentForm(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all cursor-pointer"
                      required
                    >
                      {PAYMENT_FORMS.map((form) => (
                        <option key={form.code} value={form.code}>{form.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="payment-method" className="block text-sm font-medium text-foreground mb-2">Método de pago</label>
                    <select
                      id="payment-method"
                      value={paymentMethodCode}
                      onChange={(e) => setPaymentMethodCode(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all cursor-pointer"
                      required
                    >
                      {PAYMENT_METHODS.map((method) => (
                        <option key={method.code} value={method.code}>{method.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {selectedPaymentMethod?.requiresReference && (
                  <div className="mt-3">
                    <label htmlFor="payment-reference" className="block text-sm font-medium text-foreground mb-2">Referencia de pago</label>
                    <input
                      id="payment-reference"
                      type="text"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      placeholder="N° de consignación"
                      maxLength={50}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
                      required
                    />
                  </div>
                )}
                {paymentForm === "2" && (
                  <div className="mt-3">
                    <label htmlFor="payment-due-date" className="block text-sm font-medium text-foreground mb-2">Fecha de vencimiento (crédito)</label>
                    <input
                      id="payment-due-date"
                      type="date"
                      value={paymentDueDate}
                      onChange={(e) => setPaymentDueDate(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
                      required
                    />
                  </div>
                )}
              </fieldset>

              <fieldset>
                <legend className="block text-sm font-medium text-foreground mb-3">Productos</legend>
                
                {items.map((item, idx) => (
                  <div key={idx} className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border bg-muted/30 mb-3">
                    <label htmlFor={`product-${idx}`} className="sr-only">Producto {idx + 1}</label>
                    <select
                      id={`product-${idx}`}
                      value={item.productId}
                      onChange={(e) => updateItemProduct(idx, Number(e.target.value))}
                      className="flex-1 min-w-[140px] px-3 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-coffee-medium transition-all cursor-pointer"
                      aria-label="Seleccionar producto"
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
                    
                    <label htmlFor={`presentation-${idx}`} className="sr-only">Presentación {idx + 1}</label>
                    <select
                      id={`presentation-${idx}`}
                      value={item.presentation}
                      onChange={(e) => updateItemPresentation(idx, e.target.value)}
                      className="w-24 px-2 py-2 rounded-lg bg-background border border-border text-sm outline-none focus:border-coffee-medium transition-all cursor-pointer"
                      aria-label="Seleccionar presentación"
                    >
                      <option value="500grs">500grs</option>
                      <option value="250grs">250grs</option>
                      <option value="125grs">125grs</option>
                    </select>
                    
                    <label htmlFor={`quantity-${idx}`} className="sr-only">Cantidad {idx + 1}</label>
                    <input
                      id={`quantity-${idx}`}
                      type="number"
                      min="1"
                      max="999"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                      className="w-16 px-2 py-2 rounded-lg bg-background border border-border text-sm text-center outline-none focus:border-coffee-medium transition-all"
                      aria-label={`Cantidad para ${item.productName}`}
                    />
                    
                    <div className="w-24 text-right text-sm font-medium text-foreground" aria-label={`Subtotal: ${formatCOP(item.price * item.quantity)}`}>
                      {formatCOP(item.price * item.quantity)}
                    </div>
                    
                    <button
                      onClick={() => removeItem(idx)}
                      className="size-8 rounded-lg hover:bg-danger/10 flex items-center justify-center text-danger transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-danger"
                      aria-label={`Eliminar ${item.productName}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ))}
                
                <button
                  onClick={() => inStockProducts.length > 0 && addItem(inStockProducts[0])}
                  disabled={inStockProducts.length === 0}
                  className="w-full py-2.5 rounded-xl border-2 border-dashed border-border text-sm text-muted-foreground hover:border-coffee-medium hover:text-coffee-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-coffee-medium"
                  aria-label="Agregar nuevo producto a la venta"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  {inStockProducts.length === 0 ? "Sin productos disponibles" : "Agregar producto"}
                </button>
              </fieldset>
            </div>

            <div className="px-6 py-5 border-t border-border bg-muted/30 flex items-center justify-between gap-4 shrink-0">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Total</p>
                <p className="font-display text-2xl text-foreground">{formatCOP(total)}</p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={resetForm} aria-label="Cancelar venta">
                  Cancelar
                </Button>
                <Button onClick={handleSubmit} loading={saving} aria-busy={saving}>
                  Registrar venta
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDetail && (
        <Modal
          isOpen={true}
          onClose={() => setShowDetail(null)}
          title={`Venta #${showDetail.id}`}
          description={`Cliente: ${showDetail.customer}`}
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

      {showInvoice && (
        <Modal
          isOpen
          onClose={() => setShowInvoice(null)}
          title={`Generar factura electrónica · Venta #${showInvoice.id}`}
          description={`Cliente: ${showInvoice.customer} · Total: ${formatCOP(showInvoice.total)}`}
          size="xl"
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Forma de pago</span>
                <span className="font-medium">
                  {PAYMENT_FORMS.find((f) => f.code === showInvoice.payment_form)?.label ||
                    (showInvoice.payment_form ? `Código ${showInvoice.payment_form}` : "—")}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Método de pago</span>
                <span className="font-medium">
                  {PAYMENT_METHODS.find((m) => m.code === showInvoice.payment_method_code)?.label ||
                    (showInvoice.payment_method_code ? `Código ${showInvoice.payment_method_code}` : "—")}
                </span>
              </div>
              {showInvoice.payment_reference && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Referencia</span>
                  <span className="font-medium font-mono text-xs">{showInvoice.payment_reference}</span>
                </div>
              )}
              {showInvoice.payment_form === "2" && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Vencimiento (crédito)</span>
                  <span className="font-medium">{showInvoice.payment_due_date || "—"}</span>
                </div>
              )}
            </div>

            {!showInvoice.payment_form || !showInvoice.payment_method_code ? (
              <p className="text-sm rounded-xl border border-danger/20 bg-danger/5 text-danger px-4 py-3">
                Esta venta no tiene datos de pago (payment_form/payment_method_code). Regístrala con datos de pago antes de facturar.
              </p>
            ) : showInvoice.payment_form === "2" && !showInvoice.payment_due_date ? (
              <p className="text-sm rounded-xl border border-danger/20 bg-danger/5 text-danger px-4 py-3">
                La venta es a crédito (payment_form=2) y requiere fecha de vencimiento. Edita la venta antes de facturar.
              </p>
            ) : (
              <>
                <fieldset>
                  <legend className="text-sm font-medium text-foreground mb-3">Datos fiscales del cliente</legend>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <button
                      type="button"
                      onClick={() => setCustForm((f) => ({ ...f, legal: "2", docCode: f.docCode === "31" ? "13" : f.docCode }))}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel ${
                        custForm.legal === "2" ? "bg-coffee-dark text-cream shadow-soft" : "border border-border hover:bg-muted text-foreground"
                      }`}
                      aria-pressed={custForm.legal === "2"}
                    >
                      Persona natural
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustForm((f) => ({ ...f, legal: "1", docCode: f.docCode === "13" ? "31" : f.docCode }))}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-caramel ${
                        custForm.legal === "1" ? "bg-coffee-dark text-cream shadow-soft" : "border border-border hover:bg-muted text-foreground"
                      }`}
                      aria-pressed={custForm.legal === "1"}
                    >
                      Persona jurídica
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="invoice-doc-code" className="block text-sm font-medium text-foreground mb-2">Tipo de documento *</label>
                      <select
                        id="invoice-doc-code"
                        value={custForm.docCode}
                        onChange={(e) => setCustForm((f) => ({ ...f, docCode: e.target.value }))}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all cursor-pointer"
                        required
                      >
                        {DOCUMENT_CODES.map((d) => (
                          <option key={d.code} value={d.code}>{d.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="invoice-identification" className="block text-sm font-medium text-foreground mb-2">Número de identificación *</label>
                      <input
                        id="invoice-identification"
                        type="text"
                        value={custForm.identification}
                        onChange={(e) => setCustForm((f) => ({ ...f, identification: e.target.value }))}
                        placeholder="Sin dígito de verificación"
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
                        required
                      />
                    </div>

                    {custForm.legal === "1" && (
                      <>
                        <div>
                          <label htmlFor="invoice-company" className="block text-sm font-medium text-foreground mb-2">Razón social *</label>
                          <input
                            id="invoice-company"
                            type="text"
                            value={custForm.company}
                            onChange={(e) => setCustForm((f) => ({ ...f, company: e.target.value }))}
                            className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
                            required
                          />
                        </div>
                        <div>
                          <label htmlFor="invoice-dv" className="block text-sm font-medium text-foreground mb-2">DV (dígito de verificación)</label>
                          <input
                            id="invoice-dv"
                            type="text"
                            value={custForm.dv}
                            onChange={(e) => setCustForm((f) => ({ ...f, dv: e.target.value }))}
                            placeholder="Opcional, Factus lo calcula"
                            className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
                          />
                        </div>
                      </>
                    )}

                    {custForm.legal === "2" && (
                      <div className="sm:col-span-2">
                        <label htmlFor="invoice-names" className="block text-sm font-medium text-foreground mb-2">Nombre completo *</label>
                        <input
                          id="invoice-names"
                          type="text"
                          value={custForm.names}
                          onChange={(e) => setCustForm((f) => ({ ...f, names: e.target.value }))}
                          className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label htmlFor="invoice-trade-name" className="block text-sm font-medium text-foreground mb-2">Nombre comercial</label>
                      <input
                        id="invoice-trade-name"
                        type="text"
                        value={custForm.tradeName}
                        onChange={(e) => setCustForm((f) => ({ ...f, tradeName: e.target.value }))}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="invoice-email" className="block text-sm font-medium text-foreground mb-2">Correo (para enviar la factura)</label>
                      <input
                        id="invoice-email"
                        type="email"
                        value={custForm.email}
                        onChange={(e) => setCustForm((f) => ({ ...f, email: e.target.value }))}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="invoice-phone" className="block text-sm font-medium text-foreground mb-2">Teléfono</label>
                      <input
                        id="invoice-phone"
                        type="text"
                        value={custForm.phone}
                        onChange={(e) => setCustForm((f) => ({ ...f, phone: e.target.value }))}
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label htmlFor="invoice-municipality" className="block text-sm font-medium text-foreground mb-2">Municipio (código DIAN)</label>
                      <input
                        id="invoice-municipality"
                        type="text"
                        value={custForm.municipalityCode}
                        onChange={(e) => setCustForm((f) => ({ ...f, municipalityCode: e.target.value }))}
                        placeholder="Ej. 68679 San Gil"
                        className="w-full px-4 py-2.5 text-sm rounded-xl border border-border bg-background focus:border-coffee-medium focus:ring-2 focus:ring-coffee-medium/20 outline-none transition-all"
                      />
                    </div>
                  </div>
                </fieldset>

                <div className="pt-4 border-t border-border mt-2 flex items-center justify-between gap-4">
                  <p className="text-xs text-muted-foreground">
                    La factura se generará con el código de referencia FACT-{showInvoice.id}. No se reenviará automáticamente si ya está en procesamiento.
                  </p>
                  <div className="flex items-center gap-3 shrink-0">
                    <Button variant="ghost" onClick={() => setShowInvoice(null)} aria-label="Cancelar facturación">
                      Cancelar
                    </Button>
                    <Button onClick={handleGenerateInvoice} loading={invoiceBusy} aria-busy={invoiceBusy}>
                      Generar factura
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}