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
       ORDER BY p.id DESC`
    );
    
    const productsWithPrices = products.map(p => ({
      ...p,
      category_id: (p as any).category_id,
      category_slug: (p as any).category_slug,
      price_500g: p.price_500g || p.price,
      price_250g: p.price_250g || Math.round(p.price * 0.55),
      price_125g: p.price_125g || Math.round(p.price * 0.3),
    }));
    
    return NextResponse.json({ products: productsWithPrices });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json({ products: [] });
  }
}

// POST new product
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
    const slug = sanitizeSlug(body?.slug || name);
    const description = sanitizeString(body?.description, 2000);
    const categoryId = sanitizeNumericId(body?.category_id) || 1;
    const presentation = sanitizeString(body?.presentation, 20);
    const price = Number(body?.price_500g) || Number(body?.price) || 0;
    const stock = sanitizeNumericId(body?.stock) || 0;
    const image = sanitizeString(body?.image, 500);
    const featured = Boolean(body?.featured);

    if (!name || !presentation) {
      return NextResponse.json({ error: "Nombre y presentación son requeridos" }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO products (name, slug, category_id, presentation, price, stock, image, featured, active, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [name, slug, categoryId, presentation, price, stock, image, featured, description]
    );
    
    return NextResponse.json({ id: result, message: "Producto creado" });
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

    const name = sanitizeString(body?.name, 100);
    const slug = sanitizeSlug(body?.slug || name);
    const description = sanitizeString(body?.description, 2000);
    const categoryId = sanitizeNumericId(body?.category_id) || 1;
    const presentation = sanitizeString(body?.presentation, 20);
    const price = Number(body?.price_500g) || Number(body?.price) || 0;
    const stock = sanitizeNumericId(body?.stock) || 0;
    const image = sanitizeString(body?.image, 500);
    const featured = Boolean(body?.featured);
    const active = Boolean(body?.active);

    await query(
      `UPDATE products SET name = ?, slug = ?, category_id = ?, presentation = ?, price = ?, stock = ?, image = ?, featured = ?, active = ?, description = ? WHERE id = ?`,
      [name, slug, categoryId, presentation, price, stock, image, featured, active, description, id]
    );
    
    return NextResponse.json({ message: "Producto actualizado" });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
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