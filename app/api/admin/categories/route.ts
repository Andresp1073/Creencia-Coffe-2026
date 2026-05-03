import { NextRequest, NextResponse } from "next/server";
import { queryMany, query } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";
import { sanitizeString, sanitizeSlug } from "@/lib/security/sanitize";

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const categories = await queryMany<any[]>("SELECT id, name, slug, description FROM categories ORDER BY id");
    return NextResponse.json({ 
      categories: categories.map(c => ({
        ...c,
        active: true
      }))
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json({ error: "Error al cargar categorías" }, { status: 500 });
  }
}

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

    const name = sanitizeString(body?.name, 50);
    if (!name) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const slug = sanitizeSlug(name);
    const description = sanitizeString(body?.description, 500);
    
    const result = await query(
      "INSERT INTO categories (name, slug, description) VALUES (?, ?, ?)",
      [name, slug, description]
    );
    
    return NextResponse.json({ id: result, message: "Categoría creada" });
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 });
  }
}

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

    const id = Number(body?.id);
    if (!id || id < 1) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const name = sanitizeString(body?.name, 50);
    if (!name) {
      return NextResponse.json({ error: "Nombre requerido" }, { status: 400 });
    }

    const slug = sanitizeSlug(name);
    const description = sanitizeString(body?.description, 500);
    
    await query(
      "UPDATE categories SET name = ?, slug = ?, description = ? WHERE id = ?",
      [name, slug, description, id]
    );
    
    return NextResponse.json({ message: "Categoría actualizada" });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json({ error: "Error al actualizar categoría" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get("id"));
    
    if (!id || id < 1) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }
    
    await query("DELETE FROM categories WHERE id = ?", [id]);
    
    return NextResponse.json({ message: "Categoría eliminada" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Error al eliminar categoría" }, { status: 500 });
  }
}