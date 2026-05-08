import Link from "next/link";
import { Package, ShoppingCart, TrendingUp, AlertTriangle, ArrowRight } from "lucide-react";
import { formatCOP } from "@/lib/utils";
import { getDashboardData } from "@/lib/dashboard/dashboard.service";
import { requireAdminSession } from "@/lib/auth/require-admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdminSession();
  
  const { alerts, topProducts, stats } = await getDashboardData();

  const statsCards = [
    { label: "Ventas hoy", value: stats.salesToday, hint: "pedidos hoy", icon: ShoppingCart, color: "bg-brand-caramel/10 text-brand-caramel" },
    { label: "Ingresos hoy", value: formatCOP(stats.revenueToday), hint: "del día", icon: TrendingUp, color: "bg-success/10 text-success" },
    { label: "Ventas del mes", value: stats.salesMonth, hint: "pedidos este mes", icon: ShoppingCart, color: "bg-info/10 text-info" },
    { label: "Ingresos del mes", value: formatCOP(stats.revenueMonth), hint: "este mes", icon: TrendingUp, color: "bg-coffee-dark/10 text-coffee-dark" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Resumen de actividad y alertas</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {statsCards.map((stat, index) => (
          <Card key={stat.label} className="group hover:shadow-warm transition-all duration-300">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">{stat.label}</p>
                <p className="font-display text-2xl lg:text-3xl text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.hint}</p>
              </div>
              <div className={`size-11 rounded-xl flex items-center justify-center ${stat.color}`}>
                <stat.icon className="size-5" strokeWidth={1.75} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products */}
        <Card variant="default" padding="none" className="lg:col-span-2 overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl text-foreground">Productos más vendidos</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Ranking de rotación</p>
            </div>
            <Link 
              href="/admin/productos" 
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-caramel hover:text-coffee-dark transition-colors"
            >
              Ver todos
              <ArrowRight className="size-4" />
            </Link>
          </div>
          {topProducts.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Package className="size-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No hay productos disponibles</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {topProducts.map((product, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                  <div className="size-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                    <Package className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.presentation}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-medium text-foreground">{product.stock} unid</p>
                    <p className="text-sm text-brand-caramel font-medium">{formatCOP(product.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Alerts */}
        <Card variant="default" padding="none" className="overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl text-foreground">Alertas de inventario</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Requieren atención</p>
            </div>
            {alerts.length > 0 && (
              <Badge variant="danger" size="sm">{alerts.length} nuevas</Badge>
            )}
          </div>
          <div className="divide-y divide-border/50">
            {alerts.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="size-12 rounded-full bg-success/10 mx-auto mb-3 flex items-center justify-center">
                  <svg className="size-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-foreground">Todo en orden</p>
                <p className="text-xs text-muted-foreground mt-1">Sin alertas pendientes</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                      alert.status === "sin-stock" ? "bg-danger/10" : "bg-warning/10"
                    }`}>
                      <AlertTriangle className={`size-5 ${
                        alert.status === "sin-stock" ? "text-danger" : "text-warning"
                      }`} strokeWidth={1.75} />
                    </div>
                    <div>
                      <p className="font-medium text-foreground text-sm">{alert.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {alert.presentation} · {alert.stock} unid
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={alert.status === "sin-stock" ? "danger" : "warning"} 
                    size="sm"
                  >
                    {alert.status === "sin-stock" ? "Sin stock" : "Stock bajo"}
                  </Badge>
                </div>
              ))
            )}
          </div>
          {alerts.length > 0 && (
            <div className="px-6 py-4 border-t border-border bg-muted/30">
              <Link 
                href="/admin/inventario" 
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-caramel hover:text-coffee-dark transition-colors"
              >
                Ver inventario completo
                <ArrowRight className="size-4" />
              </Link>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}