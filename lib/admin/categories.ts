import { queryMany } from "@/lib/db";

export interface Category {
  id: number;
  name: string;
  slug: string;
  active: boolean;
}

export async function getCategories(): Promise<Category[]> {
  try {
    const categories = await queryMany<{ id: number; name: string; slug: string; description?: string }>(
      "SELECT id, name, slug, description FROM categories ORDER BY id"
    );
    return categories.map(c => ({ 
      id: c.id, 
      name: c.name, 
      slug: c.slug, 
      active: true 
    }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}