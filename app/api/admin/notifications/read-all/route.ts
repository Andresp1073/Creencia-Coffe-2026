import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  try {
    await query("UPDATE notifications SET is_read = 1 WHERE id > 0 AND is_read = 0");
    return NextResponse.json({ success: true, message: "Todas marcadas como leídas" });
  } catch (error: any) {
    console.error("Error:", error);
    return NextResponse.json({ error: error.message || "Error" }, { status: 500 });
  }
}