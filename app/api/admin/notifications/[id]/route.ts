import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    console.log("[PUT /api/admin/notifications/[id]] Request received");
    const { id } = await params;
    console.log("[PUT] id:", id);
    
    const numericId = parseInt(id, 10);
    console.log("[PUT] numericId:", numericId);
    
    if (isNaN(numericId) || numericId < 1) {
      console.log("[PUT] Invalid ID");
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    console.log("[PUT] Executing UPDATE");
    const result = await query("UPDATE notifications SET is_read = 1 WHERE id = ?", [numericId]);
    console.log("[PUT] Result:", result);
    
    return NextResponse.json({ success: true, message: "Notificación marcada como leída" });
  } catch (error: any) {
    console.error("[PUT] Error:", error);
    return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    console.log("[DELETE /api/admin/notifications/[id]] Request received");
    const { id } = await params;
    console.log("[DELETE] id:", id);
    
    const numericId = parseInt(id, 10);
    console.log("[DELETE] numericId:", numericId);
    
    if (isNaN(numericId) || numericId < 1) {
      console.log("[DELETE] Invalid ID");
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    console.log("[DELETE] Executing DELETE");
    const result = await query("DELETE FROM notifications WHERE id = ?", [numericId]);
    console.log("[DELETE] Result:", result);
    
    return NextResponse.json({ success: true, message: "Notificación eliminada" });
  } catch (error: any) {
    console.error("[DELETE] Error:", error);
    return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
  }
}