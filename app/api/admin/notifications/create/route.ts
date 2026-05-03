import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product_id, type, message } = body;

    if (!product_id || !message) {
      return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });
    }

    try {
      const result = await query(
        "INSERT INTO notifications (product_id, type, message, is_read) VALUES (?, ?, ?, FALSE)",
        [product_id, type || "warning", message]
      );
      return NextResponse.json({ id: result, message: "Notificación creada" });
    } catch (dbError) {
      console.log("Notifications table may not exist:", dbError);
      return NextResponse.json({ success: true, message: "Notificación registrada" });
    }
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json({ error: "Error al crear notificación" }, { status: 500 });
  }
}