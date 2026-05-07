import { getInventoryData } from "@/lib/admin/inventory";
import { AdminInventoryClient } from "./admin-inventory-client";

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const { products, movements } = await getInventoryData();
  return <AdminInventoryClient initialProducts={products} initialMovements={movements} />;
}