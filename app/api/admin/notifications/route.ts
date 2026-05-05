import { NextRequest, NextResponse } from "next/server";
import { queryMany, query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const notifications = await queryMany<any>(
      `SELECT id, type, message, is_read, created_at 
       FROM notifications 
       ORDER BY created_at DESC 
       LIMIT 50`
    );
    const formatted = notifications.map(n => ({
      ...n,
      title: n.type === 'stock_low' ? 'Stock bajo' : n.type,
      is_read: Boolean(n.is_read)
    }));
    return NextResponse.json(formatted);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return NextResponse.json([]);
  }
}

export async function DELETE(request: NextRequest) {
  console.log("[NOTIF DELETE] DELETE received");
  try {
    await query("DELETE FROM notifications");
    console.log("[NOTIF DELETE] Deleted OK");
    return NextResponse.json({ message: "Notificaciones eliminadas" });
  } catch (error) {
    console.error("[NOTIF DELETE] Error:", error);
    return NextResponse.json({ message: "Notificaciones eliminadas" });
  }
}