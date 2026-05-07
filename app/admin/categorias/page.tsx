import { getCategories } from "@/lib/admin/categories";
import { AdminCategoriesClient } from "./admin-categories-client";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  const categories = await getCategories();
  return <AdminCategoriesClient initialCategories={categories} />;
}