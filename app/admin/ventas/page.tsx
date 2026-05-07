import { getSales, getProducts } from "@/lib/admin/sales";
import { AdminSalesClient } from "./admin-sales-client";

export const dynamic = "force-dynamic";

export default async function AdminVentasPage() {
  const [sales, products] = await Promise.all([
    getSales(),
    getProducts()
  ]);
  
  const activeProducts = products.filter(p => p.active && p.stock > 0);
  return <AdminSalesClient initialSales={sales} initialProducts={activeProducts} />;
}