import { NextRequest, NextResponse } from "next/server";
import { queryMany, query, queryOne } from "@/lib/db";

export async function GET() {
  try {
    const categories = await queryMany<any>("SELECT * FROM categories ORDER BY id");
    return NextResponse.json({ categories });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u');
    
    const result = await query(
      "INSERT INTO categories (name, slug, active) VALUES (?, ?, TRUE)",
      [body.name, slug]
    );
    
    return NextResponse.json({ id: result, message: "Categoría creada" });
  } catch (error) {
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const slug = body.name.toLowerCase().replace(/\s+/g, '-').replace(/á/g,'a').replace(/é/g,'e').replace(/í/g,'i').replace(/ó/g,'o').replace(/ú/g,'u');
    
    await query(
      "UPDATE categories SET name = ?, slug = ?, active = ? WHERE id = ?",
      [body.name, slug, body.active, body.id]
    );
    
    return NextResponse.json({ message: "Categoría actualizada" });
  } catch (error) {
    return NextResponse.json({ error: "Error al actualizar categoría" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    
    await query("DELETE FROM categories WHERE id = ?", [id]);
    
    return NextResponse.json({ message: "Categoría eliminada" });
  } catch (error) {
    return NextResponse.json({ error: "Error al eliminar categoría" }, { status: 500 });
  }
}