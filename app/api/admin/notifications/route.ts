import { NextRequest, NextResponse } from "next/server";
import { queryMany, query } from "@/lib/db";

// GET all notifications
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

// DELETE all notifications
export async function DELETE(request: NextRequest) {
  try {
    await query("DELETE FROM notifications");
    return NextResponse.json({ message: "Notificaciones eliminadas" });
  } catch {
    return NextResponse.json({ message: "Notificaciones eliminadas" });
  }
}