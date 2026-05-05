import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  console.log("[READ-ALL] PATCH received");
  try {
    console.log("[READ-ALL] Running UPDATE query...");
    await query("UPDATE notifications SET is_read = 1 WHERE is_read = 0");
    console.log("[READ-ALL] Query executed OK");
    return NextResponse.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch (error) {
    console.error("[READ-ALL] Error:", error);
    return NextResponse.json({ error: "Error al marcar notificaciones" }, { status: 500 });
  }
}