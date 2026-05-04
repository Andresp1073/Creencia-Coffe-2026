import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function POST(request: NextRequest) {
  const session = await requireApiAuth(request);
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    const body = await request.json();
    const { type, title, message } = body;

    console.log("Creating notification:", { type, title, message });

    if (!title || !message) {
      return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });
    }

    const fullMessage = title + ": " + message;
    console.log("Inserting notification with:", ["stock_low", null, fullMessage]);
    
    try {
      const result = await query(
        "INSERT INTO notifications (type, product_id, message, is_read) VALUES (?, ?, ?, 0)",
        ["stock_low", null, fullMessage]
      );
      console.log("Notification inserted with id:", result);
      return NextResponse.json({ id: result, message: "Notificación creada" });
    } catch (dbError) {
      console.error("DB Error creating notification:", dbError);
      return NextResponse.json({ error: "Error: " + String(dbError) }, { status: 500 });
    }
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json({ error: "Error al crear notificación" }, { status: 500 });
  }
}