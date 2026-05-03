import { NextRequest, NextResponse } from "next/server";
import { queryMany, queryOne, query } from "@/lib/db";

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
export async function GET() {
  try {
    const products = await queryMany<Product>(
      `SELECT p.*, c.name as category 
       FROM products p 
       LEFT JOIN categories c ON p.category_id = c.id 
       ORDER BY p.id DESC`
    );
    
    const productsWithPrices = products.map(p => ({
      ...p,
      category_id: (p as any).category_id,
      price_500g: p.price_500g || p.price,
      price_250g: p.price_250g || Math.round(p.price * 0.55),
      price_125g: p.price_125g || Math.round(p.price * 0.3),
    }));
    
    return NextResponse.json({ products: productsWithPrices });
  } catch (error) {
    return NextResponse.json({ products: [] });
  }
}

// POST new product
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const description = body.description || "";
    const categoryId = body.category_id || 1;
    
    const result = await query(
      `INSERT INTO products (name, slug, category_id, presentation, price, stock, image, featured, active, description) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE, ?)`,
      [body.name, body.slug, categoryId, body.presentation, body.price_500g || body.price, body.stock, body.image || "", body.featured || false, description]
    );
    
    return NextResponse.json({ id: result, message: "Producto creado" });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear producto" }, { status: 500 });
  }
}

// PUT update product
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const description = body.description || "";
    const categoryId = body.category_id || 1;
    
    await query(
      `UPDATE products SET name = ?, slug = ?, category_id = ?, presentation = ?, price = ?, stock = ?, image = ?, featured = ?, active = ?, description = ? WHERE id = ?`,
      [body.name, body.slug, categoryId, body.presentation, body.price_500g || body.price, body.stock, body.image || "", body.featured || false, body.active, description, body.id]
    );
    
    return NextResponse.json({ message: "Producto actualizado" });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}

// DELETE product
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    
    await query("DELETE FROM products WHERE id = ?", [id]);
    
    return NextResponse.json({ message: "Producto eliminado" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}