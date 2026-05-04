import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";

// PATCH mark all notifications as read
export async function PATCH(request: NextRequest) {
  const session = await requireApiAuth(request);
  if (session instanceof NextResponse) {
    return session;
  }

  try {
    await query("UPDATE notifications SET is_read = 1 WHERE is_read = 0");
    return NextResponse.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error) {
    console.error("Error marking all as read:", error);
    return NextResponse.json({ error: "Error al marcar notificaciones" }, { status: 500 });
  }
}