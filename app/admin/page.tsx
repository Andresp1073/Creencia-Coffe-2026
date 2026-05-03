import Link from "next/link";
import { Package, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
import { formatCOP } from "@/lib/utils";

export default function AdminDashboard() {
  // Mock data - replace with actual DB queries
  const stats = [
    { label: "Ventas hoy", value: "5", hint: "pedidos", icon: ShoppingCart, color: "text-coffee-dark" },
    { label: "Ingresos hoy", value: "$125.000", hint: "del día", icon: TrendingUp, color: "text-green-600" },
    { label: "Ventas del mes", value: "48", hint: "pedidos", icon: ShoppingCart, color: "text-coffee-dark" },
    { label: "Ingresos del mes", value: "$1.240.000", hint: "vs mes anterior", icon: TrendingUp, color: "text-sage" },
  ];

  const topProducts = [
    { name: "Café Tostado Medio 500g", presentation: "500g", sold: 15, revenue: 375000 },
    { name: "Café Suave 250g", presentation: "250g", sold: 12, revenue: 180000 },
    { name: "Café Molido 125g", presentation: "125g", sold: 8, revenue: 88000 },
  ];

  const alerts = [
    { name: "Café Suave 250g", presentation: "250g", stock: 5, status: "bajo" },
    { name: "Café Molido 125g", presentation: "125g", stock: 3, status: "bajo" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen de la actividad de tu emprendimiento</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="p-6 rounded-2xl bg-card shadow-soft border border-border/50"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <stat.icon className={`size-5 ${stat.color}`} strokeWidth={1.75} />
            </div>
            <div className="font-display text-2xl">{stat.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{stat.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Top Products */}
        <div className="lg:col-span-2 bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-border/50">
            <h2 className="font-display text-xl">Más vendidos</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Productos con mayor rotación</p>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground border-b border-border/50">
                <th className="px-6 py-3 font-normal">Producto</th>
                <th className="px-6 py-3 font-normal">Presentación</th>
                <th className="px-6 py-3 font-normal text-right">Vendidos</th>
                <th className="px-6 py-3 font-normal text-right">Ingresos</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((product, i) => (
                <tr
                  key={i}
                  className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors"
                >
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="size-4 text-muted-foreground" />
                      </div>
                      <div className="font-medium text-foreground">{product.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-3.5 text-muted-foreground">{product.presentation}</td>
                  <td className="px-6 py-3.5 text-right font-medium">{product.sold}</td>
                  <td className="px-6 py-3.5 text-right font-medium text-coffee-dark">
                    {formatCOP(product.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Alerts */}
        <div className="bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-border/50">
            <h2 className="font-display text-xl">Alertas</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Stock que requiere atención</p>
          </div>
          <div className="divide-y divide-border/40">
            {alerts.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Todo en orden ✓
              </div>
            ) : (
              alerts.map((alert, i) => (
                <div key={i} className="px-6 py-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="size-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                      <AlertTriangle className="size-4 text-amber-700" strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="text-sm font-medium leading-tight">{alert.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {alert.presentation} · {alert.stock} unid
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
                    Bajo
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}