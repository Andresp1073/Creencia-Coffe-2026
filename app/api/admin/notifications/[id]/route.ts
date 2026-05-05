import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await query("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
    return NextResponse.json({ message: "Notificación marcada como leída" });
  } catch {
    return NextResponse.json({ message: "Notificación marcada como leída" });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await query("DELETE FROM notifications WHERE id = ?", [id]);
    return NextResponse.json({ message: "Notificación eliminada" });
  } catch {
    return NextResponse.json({ message: "Notificación eliminada" });
  }
}