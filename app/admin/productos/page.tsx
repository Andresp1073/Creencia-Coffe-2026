import { getProducts, getCategories } from "@/lib/admin/products";
import { AdminProductsClient } from "./admin-products-client";
import { requireAdminSession } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  await requireAdminSession();
  
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories()
  ]);

  return <AdminProductsClient initialProducts={products} initialCategories={categories} />;
}