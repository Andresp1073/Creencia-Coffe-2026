import { query, queryMany, queryOne } from "@/lib/db";
import { Product, Category } from "./products.types";

export async function getProducts(): Promise<Product[]> {
  try {
    const products = await queryMany<Product[]>(
      `SELECT p.*, c.name as category_name, c.slug as category_slug 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.active = TRUE 
       ORDER BY p.id DESC`
    );
    return products.map(transformProduct);
  } catch {
    return getLocalProducts();
  }
}

export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const products = await queryMany<Product[]>(
      `SELECT p.*, c.name as category_name, c.slug as category_slug 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.active = TRUE AND p.featured = TRUE 
       ORDER BY p.id DESC`
    );
    return products.map(transformProduct);
  } catch {
    return getLocalProducts().filter(p => p.featured);
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const product = await queryOne<Product>(
      `SELECT p.*, c.name as category_name, c.slug as category_slug 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.slug = ? AND p.active = TRUE`,
      [slug]
    );
    if (!product) return null;
    return transformProduct(product);
  } catch {
    return getLocalProducts().find(p => p.slug === slug) || null;
  }
}

export async function getCategories(): Promise<Category[]> {
  try {
    const categories = await queryMany<any>("SELECT * FROM categories");
    return categories.map(c => ({
      id: String(c.id),
      name: c.name,
      slug: c.slug
    }));
  } catch {
    return [];
  }
}

function transformProduct(p: any): Product {
  const priceValue = Number(p.price);
  
  let price_500g = priceValue;
  let price_250g = Math.round(priceValue * 0.55);
  let price_125g = Math.round(priceValue * 0.3);
  
  if (p.description && p.description.startsWith('{')) {
    try {
      const prices = JSON.parse(p.description);
      price_500g = prices.price_500g || priceValue;
      price_250g = prices.price_250g || Math.round(priceValue * 0.55);
      price_125g = prices.price_125g || Math.round(priceValue * 0.3);
    } catch (e) {
      // Use defaults
    }
  }
  
  const imageUrl = p.image?.startsWith("http") 
    ? p.image 
    : p.image || "/imagenes/default-producto.jpg";

  return {
    id: String(p.id || ""),
    slug: p.slug || "",
    name: p.name || "Producto",
    category: p.category_name || p.category || "Café",
    categorySlug: p.category_slug,
    presentation: (p.presentation as "500g" | "250g" | "125g") || "500g",
    price: price_500g,
    price_500g,
    price_250g,
    price_125g,
    image: imageUrl,
    description: p.description || "",
    featured: Boolean(p.featured),
    active: Boolean(p.active),
    stock: Number(p.stock || 0),
  };
}

// Local fallback products
function getLocalProducts(): Product[] {
  return [
    {
      id: "1",
      slug: "cafe-tostado-medio-500g",
      name: "Café Tostado Medio",
      category: "Café",
      presentation: "500g",
      price: 25000,
      image: "/imagenes/default-producto.jpg",
      description: "Café de tueste medio con notas de chocolate y caramelo.",
      featured: true,
    },
    {
      id: "2",
      slug: "cafe-suave-250g",
      name: "Café Suave",
      category: "Café",
      presentation: "250g",
      price: 15000,
      image: "/imagenes/home-cafe.jpg",
      description: "Café suave ideal para el начало del día.",
      featured: true,
    },
    {
      id: "3",
      slug: "cafe-molido-tradicional-125g",
      name: "Café Molido Tradicional",
      category: "Café",
      presentation: "125g",
      price: 11000,
      image: "/imagenes/cafe-artesanal.jpg",
      description: "Café molido listo para preparar.",
      featured: false,
    },
  ];
}