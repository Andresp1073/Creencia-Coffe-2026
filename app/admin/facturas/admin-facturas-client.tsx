"use client";

import { useState, useCallback } from "react";
import { Eye, RefreshCw, FileText, CheckCircle2, AlertTriangle, Clock, Ban } from "lucide-react";
import { toast } from "sonner";
import { formatCOP } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { PAYMENT_FORMS, PAYMENT_METHODS } from "@/lib/factus/payment";

interface InvoiceData {
  id: number;
  order_id: number;
  reference_code: string;
  status: string;
  number: string | null;
  cufe: string | null;
  is_validated: boolean;
  validated_at: string | null;
  created_at: string;
  customer: string | null;
  total: number | null;
  error: string | null;
  payment_form: string | null;
  payment_method_code: string | null;
}

interface Props {
  initialInvoices: InvoiceData[];
}

const STATUS_META: Record<string, { label: string; classes: string }> = {
  pending: { label: "Pendiente", classes: "bg-muted text-muted-foreground" },
  processing: { label: "Procesando", classes: "bg-amber-100 text-amber-800" },
  validated: { label: "Validada", classes: "bg-success/10 text-success" },
  failed: { label: "Fallida", classes: "bg-danger/10 text-danger" },
  cancelled: { label: "Cancelada", classes: "bg-gray-100 text-gray-700" },
};

const PAYMENT_FORM_LABEL = Object.fromEntries(PAYMENT_FORMS.map((f) => [f.code, f.label]));
const PAYMENT_METHOD_LABEL = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.code, m.label]));

export function AdminFacturasClient({ initialInvoices }: Props) {
  const [invoices, setInvoices] = useState<InvoiceData[]>(initialInvoices);
  const [detail, setDetail] = useState<InvoiceData | null>(null);
  const [working, setWorking] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/invoices", { credentials: "include", cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data.invoices || []);
      }
    } catch (e) {
      console.error("Error fetching invoices:", e);
    }
  }, []);

  const handleRetry = useCallback(async (inv: InvoiceData) => {
    if (working) return;
    setWorking(inv.id);
    try {
      const res = await fetch(`/api/admin/invoices/${inv.order_id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "No se pudo generar la factura");
        await refresh();
        return;
      }
      const next = data.invoice as InvoiceData | undefined;
      if (next?.status === "processing") {
        toast.warning(
          "Factura en procesamiento. No se reenviará automáticamente para evitar duplicados."
        );
      } else if (next?.status === "validated") {
        toast.success(data.message || `Factura ${next.number} validada`);
      } else {
        toast.success(data.message || "Factura generada");
      }
      await refresh();
    } catch (e) {
      console.error("Error retrying invoice:", e);
      toast.error("Error al intentar facturar");
    } finally {
      setWorking(null);
    }
  }, [working, refresh]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-foreground">Facturas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Facturación electrónica ante Factus (DIAN)
          </p>
        </div>
        <Button
          variant="outline"
          size="md"
          onClick={refresh}
          aria-label="Actualizar lista de facturas"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Actualizar
        </Button>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-soft overflow-hidden" role="region" aria-label="Lista de facturas">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4 font-medium text-left" scope="col">Factura</th>
                <th className="px-6 py-4 font-medium text-left" scope="col">Referencia</th>
                <th className="px-6 py-4 font-medium text-left" scope="col">Pedido</th>
                <th className="px-6 py-4 font-medium text-left" scope="col">Cliente</th>
                <th className="px-6 py-4 font-medium text-left" scope="col">Estado</th>
                <th className="px-6 py-4 font-medium text-left" scope="col">Fecha</th>
                <th className="px-6 py-4 font-medium text-right" scope="col">Total</th>
                <th className="px-6 py-4 font-medium text-left" scope="col">CUFE</th>
                <th className="px-6 py-4 font-medium text-right" scope="col">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-muted-foreground">
                    No hay facturas aún. Genera una desde la sección Ventas.
                  </td>
                </tr>
              ) : invoices.map((inv) => {
                const meta = STATUS_META[inv.status] || STATUS_META.pending;
                const retriable = inv.status === "failed" || inv.status === "pending";
                const Icon =
                  inv.status === "validated" ? CheckCircle2
                  : inv.status === "processing" ? Clock
                  : inv.status === "failed" ? AlertTriangle
                  : inv.status === "cancelled" ? Ban
                  : FileText;
                return (
                  <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-brand-caramel">
                      {inv.number || inv.reference_code}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-xs">
                      {inv.reference_code}
                    </td>
                    <td className="px-6 py-4">#{inv.order_id}</td>
                    <td className="px-6 py-4 font-medium">{inv.customer || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${meta.classes}`}>
                        <Icon className="size-3.5" aria-hidden="true" />
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {inv.validated_at
                        ? new Date(inv.validated_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
                        : new Date(inv.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-6 py-4 text-right font-medium tabular-nums">
                      {inv.total != null ? formatCOP(inv.total) : "—"}
                    </td>
                    <td className="px-6 py-4">
                      {inv.cufe ? (
                        <span
                          className="font-mono text-xs text-muted-foreground line-clamp-1 max-w-[180px]"
                          title={inv.cufe}
                        >
                          {inv.cufe}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDetail(inv)}
                          aria-label={`Ver detalle de factura ${inv.reference_code}`}
                        >
                          <Eye className="size-4" aria-hidden="true" />
                          Ver
                        </Button>
                        {retriable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRetry(inv)}
                            disabled={working !== null}
                            aria-label={`Reintentar factura ${inv.reference_code}`}
                          >
                            <RefreshCw className={`size-4 ${working === inv.id ? "animate-spin" : ""}`} aria-hidden="true" />
                            {inv.status === "failed" ? "Reintentar" : "Generar"}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {detail && (
        <Modal
          isOpen
          onClose={() => setDetail(null)}
          title={`Factura ${detail.number || detail.reference_code}`}
          description={`Referencia ${detail.reference_code} · Pedido #${detail.order_id}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_META[detail.status]?.classes || ""}`}>
                {STATUS_META[detail.status]?.label || detail.status}
              </span>
              <span className="text-sm text-muted-foreground">
                {detail.is_validated ? "Validada por DIAN" : "Aún no validada"}
              </span>
            </div>

            {detail.status === "processing" && (
              <p className="text-sm rounded-xl bg-amber-50 text-amber-800 border border-amber-200 px-4 py-3">
                Factura en procesamiento. No se reenviará automáticamente para evitar duplicados. Verifica el estado en Factus.
              </p>
            )}
            {detail.status === "failed" && (
              <p className="text-sm rounded-xl bg-danger/5 text-danger border border-danger/20 px-4 py-3">
                La factura falló. Revisa el detalle en Factus y reintenta desde la lista.
              </p>
            )}
            {detail.status === "cancelled" && (
              <p className="text-sm rounded-xl bg-muted text-muted-foreground px-4 py-3">
                Esta factura está cancelada y no se reenviará automáticamente.
              </p>
            )}

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Cliente</dt>
                <dd className="mt-1 font-medium">{detail.customer || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Total</dt>
                <dd className="mt-1 font-display text-xl">{detail.total != null ? formatCOP(detail.total) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Forma de pago</dt>
                <dd className="mt-1">{detail.payment_form ? PAYMENT_FORM_LABEL[detail.payment_form] || detail.payment_form : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Método de pago</dt>
                <dd className="mt-1">{detail.payment_method_code ? PAYMENT_METHOD_LABEL[detail.payment_method_code] || detail.payment_method_code : "—"}</dd>
              </div>
              {detail.number && (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Número DIAN</dt>
                  <dd className="mt-1 font-mono">{detail.number}</dd>
                </div>
              )}
              {detail.cufe && (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">CUFE</dt>
                  <dd className="mt-1 font-mono text-xs break-all">{detail.cufe}</dd>
                </div>
              )}
              {detail.validated_at && (
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Validada en</dt>
                  <dd className="mt-1">{new Date(detail.validated_at).toLocaleString("es-CO")}</dd>
                </div>
              )}
            </dl>
          </div>
        </Modal>
      )}
    </div>
  );
}