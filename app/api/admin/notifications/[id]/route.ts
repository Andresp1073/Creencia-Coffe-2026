import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

// PUT mark notification as read
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await query("UPDATE notifications SET is_read = TRUE WHERE id = ?", [id]);
    return NextResponse.json({ message: "Notificación marcada como leída" });
  } catch {
    return NextResponse.json({ message: "Notificación marcada como leída" });
  }
}

// PUT mark all as read
export async function PATCH(request: NextRequest) {
  try {
    await query("UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE");
    return NextResponse.json({ message: "Todas las notificaciones marcadas como leídas" });
  } catch {
    return NextResponse.json({ message: "Todas las notificaciones marcadas como leídas" });
  }
}