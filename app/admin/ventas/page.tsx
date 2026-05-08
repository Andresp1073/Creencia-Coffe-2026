import { getSales, getProducts } from "@/lib/admin/sales";
import { AdminSalesClient } from "./admin-sales-client";
import { requireAdminSession } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminVentasPage() {
  await requireAdminSession();
  
  const [sales, products] = await Promise.all([
    getSales(),
    getProducts()
  ]);
  
  const activeProducts = products.filter(p => (p.active as any) !== false && (p.active as any) !== 0);
  return <AdminSalesClient initialSales={sales} initialProducts={activeProducts} />;
}