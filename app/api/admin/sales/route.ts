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
    
    console.log("Orders raw:", orders);
    
    const parsedOrders = orders.map(o => {
      let items = [];
      try {
        if (o.items) {
          items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
        }
      } catch (e) {
        console.log("Error parsing items:", e);
        items = [];
      }
      return { 
        ...o, 
        items,
        total: Number(o.total) || 0
      };
    });
    
    return NextResponse.json({ sales: parsedOrders });
  } catch (error: any) {
    console.error("Error fetching sales:", error);
    console.error("Error message:", error.message);
    return NextResponse.json({ error: error.message, sales: [] });
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

    console.log("POST sale body:", body);

    const customer = sanitizeString(body?.customer, 100);
    const total = Number(body?.total) || 0;
    const items = JSON.stringify(body?.items || []);

    console.log("Inserting:", { customer, total, items });

    if (!customer) {
      return NextResponse.json({ error: "Cliente es requerido" }, { status: 400 });
    }

    // Use exact column names matching the table
    const result: any = await query(
      `INSERT INTO orders (customer_name, total, items, status) VALUES (?, ?, ?, 'pending')`,
      [customer, total, items]
    );
    
    console.log("Insert result:", result);
    
    return NextResponse.json({ id: result.insertId || Date.now(), message: "Venta registrada" });
  } catch (error: any) {
    console.error("Error creating sale:", error);
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
  }
}