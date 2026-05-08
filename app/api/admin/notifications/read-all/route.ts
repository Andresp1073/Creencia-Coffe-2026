import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  try {
    console.log("[PATCH /api/admin/notifications/read-all] Request received");
    const result = await query("UPDATE notifications SET is_read = 1 WHERE id > 0 AND is_read = 0");
    console.log("[PATCH] Result:", result);
    return NextResponse.json({ success: true, message: "Todas marcadas como leídas" });
  } catch (error: any) {
    console.error("[PATCH] Error:", error);
    return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
  }
}