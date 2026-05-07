import { getInventoryData } from "@/lib/admin/inventory";
import { AdminInventoryClient } from "./admin-inventory-client";

export const revalidate = 15;

export default async function AdminInventoryPage() {
  const { products, movements } = await getInventoryData();
  return <AdminInventoryClient initialProducts={products} initialMovements={movements} />;
}