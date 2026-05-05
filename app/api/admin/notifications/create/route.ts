import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  console.log("[NOTIF_CREATE] New request");
  
  try {
    const body = await request.json();
    const { type, title, message } = body;
    console.log("[NOTIF_CREATE] Body:", body);

    if (!title || !message) {
      return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });
    }

    const fullMessage = title + ": " + message;
    console.log("[NOTIF_CREATE] Message:", fullMessage);

    // Get any valid product_id from products table
    const products: any[] = await query("SELECT id FROM products LIMIT 1");
    const validProductId = products.length > 0 ? products[0].id : 1;
    console.log("[NOTIF_CREATE] Using product_id:", validProductId);
    
    const result: any = await query(
      "INSERT INTO notifications (type, product_id, message, is_read) VALUES (?, ?, ?, 0)",
      ["stock_low", validProductId, fullMessage]
    );
    console.log("[NOTIF_CREATE] Inserted, id:", result);
    
    return NextResponse.json({ success: true, id: result });
  } catch (error: any) {
    console.error("[NOTIF_CREATE] ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}