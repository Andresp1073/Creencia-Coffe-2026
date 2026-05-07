import Link from "next/link";
import { Package, ShoppingCart, TrendingUp, AlertTriangle } from "lucide-react";
import { formatCOP } from "@/lib/utils";
import { getDashboardData } from "@/lib/dashboard/dashboard.service";

export const revalidate = 30;

export default async function AdminDashboard() {
  const { alerts, topProducts, stats } = await getDashboardData();

  const statsCards = [
    { label: "Ventas hoy", value: stats.salesToday, hint: "pedidos", icon: ShoppingCart, color: "text-coffee-dark" },
    { label: "Ingresos hoy", value: formatCOP(stats.revenueToday), hint: "del día", icon: TrendingUp, color: "text-green-600" },
    { label: "Ventas del mes", value: stats.salesMonth, hint: "pedidos", icon: ShoppingCart, color: "text-coffee-dark" },
    { label: "Ingresos del mes", value: formatCOP(stats.revenueMonth), hint: "vs mes anterior", icon: TrendingUp, color: "text-sage" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-3xl text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Resumen de la actividad de tu emprendimiento</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statsCards.map((stat) => (
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
          <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl">Más vendidos</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Productos con mayor rotación</p>
            </div>
            <Link href="/admin/productos" className="text-sm text-sage hover:underline">
              Ver todos
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.14em] text-muted-foreground border-b border-border/50">
                <th className="px-6 py-3 font-normal">Producto</th>
                <th className="px-6 py-3 font-normal">Presentación</th>
                <th className="px-6 py-3 font-normal text-right">Stock</th>
                <th className="px-6 py-3 font-normal text-right">Precio</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No hay productos disponibles
                  </td>
                </tr>
              ) : (
                topProducts.map((product, i) => (
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
                    <td className="px-6 py-3.5 text-right">
                      <span className="font-medium text-foreground">
                        {product.stock}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right font-medium text-coffee-dark">
                      {formatCOP(product.price)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Alerts */}
        <div className="bg-card rounded-2xl shadow-soft border border-border/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl">Alertas</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Stock que requiere atención</p>
            </div>
            {alerts.length > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                {alerts.length}
              </span>
            )}
          </div>
          <div className="divide-y divide-border/40">
            {alerts.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Todo en orden ✓
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="px-6 py-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`size-9 rounded-full flex items-center justify-center shrink-0 ${
                      alert.status === "sin-stock" ? "bg-red-100" : "bg-amber-100"
                    }`}>
                      <AlertTriangle className={`size-4 ${
                        alert.status === "sin-stock" ? "text-red-700" : "text-amber-700"
                      }`} strokeWidth={1.75} />
                    </div>
                    <div>
                      <div className="text-sm font-medium leading-tight">{alert.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {alert.presentation} · {alert.stock} unid
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    alert.status === "sin-stock" 
                      ? "bg-red-100 text-red-700" 
                      : "bg-amber-100 text-amber-700"
                  }`}>
                    {alert.status === "sin-stock" ? "Sin stock" : "Bajo"}
                  </span>
                </div>
              ))
            )}
          </div>
          {alerts.length > 0 && (
            <div className="px-6 py-4 border-t border-border/50">
              <Link href="/admin/inventario" className="text-sm text-sage hover:underline">
                Ver inventario completo →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}