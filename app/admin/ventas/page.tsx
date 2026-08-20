import { getSalesPage, getProducts, DEFAULT_SALES_PAGE_SIZE } from "@/lib/admin/sales";
import { AdminSalesClient } from "./admin-sales-client";
import { requireAdminSession } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminVentasPage() {
  await requireAdminSession();
  
  const [salesPage, products] = await Promise.all([
    getSalesPage(1, DEFAULT_SALES_PAGE_SIZE),
    getProducts()
  ]);
  
  const activeProducts = products.filter(p => (p.active as any) !== false && (p.active as any) !== 0);
  return (
    <AdminSalesClient
      initialSales={salesPage.sales}
      initialPagination={{ page: salesPage.page, pageSize: salesPage.pageSize, total: salesPage.total, totalPages: salesPage.totalPages }}
      initialProducts={activeProducts}
    />
  );
}