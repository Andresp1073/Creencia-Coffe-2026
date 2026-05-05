import { query, queryMany, queryOne } from "@/lib/db";
import { Product, Category } from "./products.types";

export async function getProducts(): Promise<Product[]> {
  try {
    const allProducts = await queryMany<any>(
      `SELECT p.*, c.name as category_name, c.slug as category_slug 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.active = TRUE 
       ORDER BY p.id ASC`
    );
    
    return allProducts.map(p => transformProduct(p));
  } catch (error) {
    console.error("Error fetching products:", error);
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
        ORDER BY p.id ASC`
    );
    return products.map(transformProduct);
  } catch {
    return getLocalProducts().filter(p => p.featured);
  }
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    const exactProduct = await queryOne<Product>(
      `SELECT p.*, c.name as category_name, c.slug as category_slug 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.slug = ? AND p.active = TRUE`,
      [slug]
    );
    
    if (exactProduct) {
      const transformed = transformProduct(exactProduct);
      transformed.availablePresentations = [transformed.presentation];
      return transformed;
    }
    
    // Fallback: get the base name from slug by removing presentation suffix
    const baseName = slug.replace(/-500g$/, '').replace(/-250g$/, '').replace(/-125g$/, '');
    
    // Find all products with the same base name (different presentations)
    const products = await queryMany<Product>(
      `SELECT p.*, c.name as category_name, c.slug as category_slug 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       WHERE p.slug LIKE ? AND p.active = TRUE
       ORDER BY p.id ASC`,
      [`${baseName}%`]
    );
    
    if (products.length === 0) return null;
    
    // Get the first product (oldest/created first) as main product
    const mainProduct = products[0];
    const transformed = transformProduct(mainProduct);
    
    // Override prices with actual prices from all presentations
    const prices: Record<string, number> = {};
    products.forEach(p => {
      const pres = p.presentation || '500g';
      prices[pres] = Number(p.price) || 0;
    });
    
    // Use actual prices from DB, fallback to calculated
    transformed.price_500g = prices['500g'] || transformed.price_500g;
    transformed.price_250g = prices['250g'] || transformed.price_250g;
    transformed.price_125g = prices['125g'] || transformed.price_125g;
    transformed.price = transformed.price;
    transformed.presentation = mainProduct.presentation as "500g" | "250g" | "125g";
    
    // Add available presentations ordered by id ASC (first created first)
    transformed.availablePresentations = products
      .map(p => p.presentation as "500g" | "250g" | "125g")
      .filter(Boolean);
    
    return transformed;
  } catch (error) {
    console.error("Error fetching product:", error);
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
  let price_250g = priceValue;
  let price_125g = priceValue;
  
  if (p.description && p.description.startsWith('{')) {
    try {
      const prices = JSON.parse(p.description);
      price_500g = prices.price_500g || priceValue;
      price_250g = prices.price_250g || priceValue;
      price_125g = prices.price_125g || priceValue;
    } catch (e) {
      // Use defaults
    }
  }
  
  const presentation = (p.presentation as "500g" | "250g" | "125g") || "500g";
  
  let imageUrl = p.image || "";
  if (imageUrl.startsWith("data:")) {
    imageUrl = imageUrl;
  } else if (imageUrl.startsWith("http")) {
    imageUrl = imageUrl;
  } else if (imageUrl) {
    imageUrl = imageUrl.startsWith("/") ? imageUrl : "/" + imageUrl;
  } else {
    imageUrl = "/imagenes/default-producto.jpg";
  }

  const price = priceValue;

  return {
    id: String(p.id || ""),
    slug: p.slug || "",
    name: p.name || "Producto",
    category: p.category_name || p.category || "Café",
    categorySlug: p.category_slug,
    presentation,
    price,
    price_500g,
    price_250g,
    price_125g,
    image: imageUrl,
    description: p.description || "",
    featured: Boolean(p.featured),
    active: Boolean(p.active),
    stock: Number(p.stock || 0),
    availablePresentations: [presentation],
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