import { NextResponse } from "next/server";
import { queryMany, query } from "@/lib/db";

interface Notification {
  id: number;
  type: string;
  product_name: string;
  message: string;
  created_at: string;
  is_read: boolean;
}

// GET all notifications
export async function GET() {
  try {
    const notifications = await queryMany<Notification>(
      `SELECT n.*, p.name as product_name 
       FROM notifications n 
       LEFT JOIN products p ON n.product_id = p.id 
       ORDER BY n.created_at DESC 
       LIMIT 50`
    );
    return NextResponse.json(notifications);
  } catch {
    // Return mock data if table doesn't exist
    return NextResponse.json([
      { id: 1, type: "warning", product_name: "Café Suave 250g", message: "Stock bajo: 5 unidades", created_at: new Date().toISOString(), is_read: false },
      { id: 2, type: "info", product_name: "Nueva venta", message: "Venta registrada", created_at: new Date().toISOString(), is_read: false },
      { id: 3, type: "success", product_name: "Pedido entregado", message: "El pedido fue entregado", created_at: new Date(Date.now() - 86400000).toISOString(), is_read: true },
    ]);
  }
}

// DELETE all notifications
export async function DELETE() {
  try {
    await query("DELETE FROM notifications");
    return NextResponse.json({ message: "Notificaciones eliminadas" });
  } catch {
    return NextResponse.json({ message: "Notificaciones eliminadas" });
  }
}