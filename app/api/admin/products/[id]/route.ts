import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

// GET single product
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const product = await query<any>(
      "SELECT p.*, c.name as category FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = ?",
      [id]
    );
    
    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }
    
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: "Error al obtener producto" }, { status: 500 });
  }
}

// PUT update product
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    if (typeof body.active === "boolean" && !body.name) {
      // Toggle active status only when no full product payload is present
      await query("UPDATE products SET active = ? WHERE id = ?", [body.active ? 1 : 0, id]);
      return NextResponse.json({ message: "Estado actualizado" });
    }
    
    const description = body.description || "";
    await query(
      `UPDATE products SET name = ?, presentation = ?, price = ?, stock = ?, image = ?, featured = ?, active = ?, description = ? WHERE id = ?`,
      [body.name, body.presentation, body.price, body.stock, body.image, body.featured ? 1 : 0, body.active ? 1 : 0, description, id]
    );
    
    return NextResponse.json({ message: "Producto actualizado" });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar producto" }, { status: 500 });
  }
}

// DELETE product
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await query("DELETE FROM products WHERE id = ?", [id]);
    return NextResponse.json({ message: "Producto eliminado" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar producto" }, { status: 500 });
  }
}