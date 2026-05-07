import { getProducts, getCategories } from "@/lib/admin/products";
import { AdminProductsClient } from "./admin-products-client";

export const revalidate = 15;

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories()
  ]);

  return <AdminProductsClient initialProducts={products} initialCategories={categories} />;
}