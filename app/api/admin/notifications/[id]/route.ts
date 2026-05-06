import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";
import { sanitizeNumericId } from "@/lib/security/sanitize";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const numericId = sanitizeNumericId(id);
    if (!numericId) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    await query("UPDATE notifications SET is_read = 1 WHERE id = ?", [numericId]);
    return NextResponse.json({ message: "Notificación marcada como leída" });
  } catch (error) {
    console.error("Error marking as read:", error);
    return NextResponse.json({ message: "Notificación marcada como leída" });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { id } = await params;
    const numericId = sanitizeNumericId(id);
    if (!numericId) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    await query("DELETE FROM notifications WHERE id = ?", [numericId]);
    return NextResponse.json({ message: "Notificación eliminada" });
  } catch (error) {
    console.error("Error deleting notification:", error);
    return NextResponse.json({ message: "Notificación eliminada" });
  }
}