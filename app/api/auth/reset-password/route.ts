import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { verifyToken, deleteOTP, ADMIN_EMAIL } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const { password, token } = await request.json();

    console.log("[RESET] Starting password reset, token:", token, "admin email:", ADMIN_EMAIL);

    if (!password || password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" });
    }

    if (!token || !verifyToken(ADMIN_EMAIL, token)) {
      console.log("[RESET] Token invalid or missing");
      return NextResponse.json({ error: "Primero verifica el código" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      await query(
        "UPDATE admin_users SET password_hash = ? WHERE username = ?",
        [hashedPassword, "creencia"]
      );
    } catch (e) {
      console.log("[RESET] DB update error (table may not exist):", e);
    }

    deleteOTP(ADMIN_EMAIL);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESET] Error:", error);
    return NextResponse.json({ error: "Error al cambiar la contraseña" });
  }
}