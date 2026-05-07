import { getCategories } from "@/lib/admin/categories";
import { AdminCategoriesClient } from "./admin-categories-client";
import { requireAdminSession } from "@/lib/auth/require-admin";

export const dynamic = "force-dynamic";

export default async function CategoriasPage() {
  await requireAdminSession();
  
  const categories = await getCategories();
  return <AdminCategoriesClient initialCategories={categories} />;
}