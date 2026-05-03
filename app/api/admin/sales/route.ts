import { NextRequest, NextResponse } from "next/server";
import { queryMany, query } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";
import { sanitizeString, sanitizeNumericId } from "@/lib/security/sanitize";

interface Order {
  id: number;
  customer_name: string;
  total: number;
  items: string;
  status: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) {
    console.log("Auth failed:", auth.status, auth.statusText);
    return auth;
  }

  try {
    const orders = await queryMany<Order>(
      `SELECT id, customer_name as customer, total, items, created_at as date, status
       FROM orders 
       ORDER BY id DESC`
    );
    
    console.log("Orders from DB:", orders);
    
    const parsedOrders = orders.map(o => ({
      ...o,
      items: o.items ? JSON.parse(o.items) : []
    }));
    
    return NextResponse.json({ sales: parsedOrders });
  } catch (error) {
    console.error("Error fetching sales:", error);
    return NextResponse.json({ error: String(error), sales: [] });
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

    const customer = sanitizeString(body?.customer, 100);
    const total = Number(body?.total) || 0;
    const items = JSON.stringify(body?.items || []);

    if (!customer) {
      return NextResponse.json({ error: "Cliente es requerido" }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO orders (customer_name, total, items, status, created_at) VALUES (?, ?, ?, 'completado', NOW())`,
      [customer, total, items]
    );
    
    return NextResponse.json({ id: result, message: "Venta registrada" });
  } catch (error) {
    console.error("Error creating sale:", error);
    return NextResponse.json({ error: "Error al registrar venta" }, { status: 500 });
  }
}