import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId) || numericId < 1) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await query("UPDATE notifications SET is_read = 1 WHERE id = ?", [numericId]);
    return NextResponse.json({ success: true, message: "Notificación marcada como leída" });
  } catch (error: any) {
    console.error("Error marking as read:", error);
    return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const numericId = parseInt(id, 10);
    
    if (isNaN(numericId) || numericId < 1) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    await query("DELETE FROM notifications WHERE id = ?", [numericId]);
    return NextResponse.json({ success: true, message: "Notificación eliminada" });
  } catch (error: any) {
    console.error("Error deleting notification:", error);
    return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
  }
}