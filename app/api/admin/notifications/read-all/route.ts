import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function PATCH(request: NextRequest) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    await query("UPDATE notifications SET is_read = 1 WHERE id > 0 AND is_read = 0");
    return NextResponse.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error: any) {
    console.error("Error marking all as read:", error);
    return NextResponse.json({ error: error.message || "Error al marcar notificaciones" }, { status: 500 });
  }
}