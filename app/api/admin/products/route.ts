import { NextRequest, NextResponse } from "next/server";
import { queryMany, queryOne, query } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";
import { sanitizeString, sanitizeSlug, sanitizeNumericId } from "@/lib/security/sanitize";

interface Product {
  id: number;
  name: string;
  slug: string;
  category: string;
  presentation: string;
  price: number;
  price_500g?: number;
  price_250g?: number;
  price_125g?: number;
  image: string;
  stock: number;
  active: boolean;
  featured: boolean;
}

// GET all products
export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const products = await queryMany<Product>(
      `SELECT p.*, c.name as category, c.slug as category_slug 
FROM products p 
        LEFT JOIN categories c ON p.category_id = c.id 
        ORDER BY p.id ASC`
    );
    
    const getImageUrl = (img: string | undefined | null) => {
      if (!img) return "/imagenes/default-producto.jpg";
      // If it's already a data URL (base64), return it as is
      if (img.startsWith("data:")) return img;
      // If it's an http URL, return it
      if (img.startsWith("http")) return img;
      // Otherwise it's a local path
      return img.startsWith("/") ? img : "/" + img;
    };

    const productsWithPrices = products.map(p => ({
      ...p,
      category_id: (p as any).category_id,
      category_slug: (p as any).category_slug,
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      presentation: p.presentation || '500g',
      price_500g: Number(p.price_500g) || Number(p.price) || 0,
      price_250g: Number(p.price_250g) || Math.round(Number(p.price) * 0.55),
      price_125g: Number(p.price_125g) || Math.round(Number(p.price) * 0.3),
      image: getImageUrl(p.image),
    }));
    
    return NextResponse.json({ products: productsWithPrices });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ products: [] });
  }
}

// POST new product - single product with one presentation
export async function POST(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const name = sanitizeString(body?.name, 100);
    const description = sanitizeString(body?.description, 2000);
    const categoryId = sanitizeNumericId(body?.category_id) || 1;
    const presentation = sanitizeString(body?.presentation, 20) || '500g';
    const price = Number(body?.price_500g) || Number(body?.price) || 0;
    const stock = sanitizeNumericId(body?.stock) || 0;
    const image = sanitizeString(body?.image, 500);
    const featured = Boolean(body?.featured);

    if (!name || !presentation) {
      return NextResponse.json({ error: "Nombre y presentación son requeridos" }, { status: 400 });
    }

    const slug = sanitizeSlug(`${name}-${presentation}`);
    
    const result: any = await query(
      `INSERT INTO products (name, slug, category_id, presentation, price, stock, image, featured, active, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [name, slug, categoryId, presentation, price, stock, image, featured, description]
    );
    
    return NextResponse.json({ id: result.insertId, message: "Producto creado" });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}

// PUT update product
export async function PUT(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    const id = sanitizeNumericId(body?.id);
    if (!id) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    // If only stock is provided, update just stock
    if (body.stock !== undefined && Object.keys(body).length <= 3 && body.name === undefined) {
      const stock = sanitizeNumericId(body?.stock) || 0;
      await query(
        `UPDATE products SET stock = ? WHERE id = ?`,
        [stock, id]
      );
      return NextResponse.json({ message: "Stock actualizado" });
    }

    // Get current product to preserve slug
    const currentProduct = await queryOne<{ slug: string }>(
      `SELECT slug FROM products WHERE id = ?`,
      [id]
    );

    const name = sanitizeString(body?.name, 100) || "";
    const slug = currentProduct?.slug || sanitizeSlug(name || "producto");
    const description = sanitizeString(body?.description, 2000) || "";
    const categoryId = sanitizeNumericId(body?.category_id) || 1;
    const presentation = sanitizeString(body?.presentation, 20) || "500g";
    const price = Number(body?.price_500g) || Number(body?.price) || 0;
    const stock = sanitizeNumericId(body?.stock) || 0;
    const image = sanitizeString(body?.image, 500) || "";
    const featured = body?.featured !== undefined ? Boolean(body?.featured) : false;
    const active = body?.active !== undefined ? Boolean(body?.active) : true;

    console.log("Updating product:", { id, name, slug, presentation });

    await query(
      `UPDATE products SET name = ?, slug = ?, category_id = ?, presentation = ?, price = ?, stock = ?, image = ?, featured = ?, active = ?, description = ? WHERE id = ?`,
      [name, slug, categoryId, presentation, price, stock, image, featured, active, description, id]
    );
    
    return NextResponse.json({ message: "Producto actualizado" });
  } catch (error: any) {
    console.error("Error updating product:", error);
    console.error("Error message:", error.message);
    return NextResponse.json({ error: error.message || "Error al actualizar producto" }, { status: 500 });
  }
}

// DELETE product
export async function DELETE(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = sanitizeNumericId(searchParams.get("id"));
    
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }
    
    await query("DELETE FROM products WHERE id = ?", [id]);
    
    return NextResponse.json({ message: "Producto eliminado" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}