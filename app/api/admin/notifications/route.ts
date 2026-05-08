import { NextRequest, NextResponse } from "next/server";
import { queryMany, query } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function GET(request: NextRequest) {
  console.log("GET /api/admin/notifications called");
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    console.log("Executing query to fetch notifications...");
    const notifications = await queryMany<any>(
      `SELECT n.id, n.type, n.message, n.is_read, n.created_at, p.name as product_name
       FROM notifications n
       LEFT JOIN products p ON n.product_id = p.id
       ORDER BY n.created_at DESC 
       LIMIT 50`
    );
    console.log("Notifications fetched, count:", notifications.length);
    const formatted = notifications.map(n => ({
      ...n,
      title: n.type === 'stock_low' ? 'Stock bajo' : n.type,
      product_name: n.product_name || 'Sistema',
      is_read: Boolean(n.is_read)
    }));
    console.log("Returning formatted notifications, count:", formatted.length);
    return NextResponse.json(formatted);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return NextResponse.json([]);
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await query("DELETE FROM notifications WHERE id > 0");
    return NextResponse.json({ message: "Notificaciones eliminadas" });
  } catch (error: any) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json({ error: error.message || "Error al eliminar las notificaciones" }, { status: 500 });
  }
}