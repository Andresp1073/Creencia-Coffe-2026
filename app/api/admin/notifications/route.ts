import { NextRequest, NextResponse } from "next/server";
import { queryMany, query } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";

interface Notification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

// GET all notifications
export async function GET(request: NextRequest) {
  const session = await requireApiAuth(request);
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    console.log("Fetching notifications from DB...");
    const notifications = await queryMany<any>(
      `SELECT id, type, message, is_read, created_at 
       FROM notifications 
       ORDER BY created_at DESC 
       LIMIT 50`
    );
    console.log("Found notifications in DB:", notifications.length, notifications);
    // Transform to match frontend expected format
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
  const session = await requireApiAuth(request);
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    await query("DELETE FROM notifications");
    return NextResponse.json({ message: "Notificaciones eliminadas" });
  } catch {
    return NextResponse.json({ message: "Notificaciones eliminadas" });
  }
}