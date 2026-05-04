import { queryMany, query } from "@/lib/db";
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function GET(request: Request) {
  const session = await requireApiAuth(request as any);
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const movements = await queryMany<any>(
      `SELECT im.id, im.type, im.quantity, im.reason, im.created_at, 
              p.name as product_name, p.presentation
       FROM inventory_movements im
       LEFT JOIN products p ON im.product_id = p.id
       ORDER BY im.created_at DESC
       LIMIT 50`
    );

    const formatted = movements.map(m => ({
      id: m.id,
      date: new Date(m.created_at).toISOString().split('T')[0],
      product_name: m.product_name ? `${m.product_name} ${m.presentation}` : 'Producto desconocido',
      type: m.type,
      qty: m.quantity,
      note: m.reason || ''
    }));

    return NextResponse.json({ movements: formatted });
  } catch (error) {
    console.error("Error fetching inventory movements:", error);
    return NextResponse.json({ movements: [] });
  }
}

export async function POST(request: Request) {
  const session = await requireApiAuth(request as any);
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const body = await request.json();
    const { product_id, type, quantity, reason } = body;

    if (!product_id || !type || !quantity) {
      return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });
    }

    const result = await query(
      "INSERT INTO inventory_movements (product_id, type, quantity, reason) VALUES (?, ?, ?, ?)",
      [Number(product_id), type, Number(quantity), reason || null]
    );
    
    return NextResponse.json({ id: result, message: "Movimiento registrado" });
  } catch (error) {
    console.error("Error creating inventory movement:", error);
    return NextResponse.json({ error: "Error al registrar movimiento: " + String(error) }, { status: 500 });
  }
}