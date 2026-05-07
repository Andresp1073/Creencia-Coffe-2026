import { getInventoryData } from "@/lib/admin/inventory";
import { AdminInventoryClient } from "./admin-inventory-client";
import { requireAdminSession } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  await requireAdminSession();
  
  const { products, movements } = await getInventoryData();
  return <AdminInventoryClient initialProducts={products} initialMovements={movements} />;
}