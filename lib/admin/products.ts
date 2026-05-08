import { queryMany } from "@/lib/db";

export interface Product {
  id: number;
  name: string;
  slug: string;
  category: string;
  category_id?: number;
  presentation: string;
  price: number;
  price_500g?: number;
  price_250g?: number;
  price_125g?: number;
  image: string;
  stock: number;
  active: boolean;
  featured: boolean;
  description?: string;
}

export async function getProducts(): Promise<Product[]> {
  try {
    const products = await queryMany<any>(
      `SELECT p.*, c.name as category, c.slug as category_slug 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       ORDER BY p.id DESC`
    );
    
    const getImageUrl = (img: string | undefined | null) => {
      if (!img) return "/imagenes/default-producto.jpg";
      if (img.startsWith("data:")) return img;
      if (img.startsWith("http")) return img;
      return img.startsWith("/") ? img : "/" + img;
    };
    
    return products.map(p => ({
      ...p,
      category_id: p.category_id,
      category_slug: p.category_slug,
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      presentation: p.presentation || '500g',
      price_500g: Number(p.price_500g) || Number(p.price) || 0,
      price_250g: Number(p.price_250g) || Math.round(Number(p.price) * 0.55),
      price_125g: Number(p.price_125g) || Math.round(Number(p.price) * 0.3),
      image: getImageUrl(p.image),
    }));
  } catch (error) {
    console.error("Error fetching products:", error);
    return [];
  }
}

export async function getCategories(): Promise<{ id: number; name: string; slug: string; active: boolean }[]> {
  try {
    const categories = await queryMany<{ id: number; name: string; slug: string; description?: string }>(
      "SELECT id, name, slug, description FROM categories ORDER BY id"
    );
    return categories.map(c => ({ id: c.id, name: c.name, slug: c.slug, active: true }));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}