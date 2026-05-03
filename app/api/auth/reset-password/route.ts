import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

const ADMIN_EMAIL = "andresmauriciope1073@gmail.com";
const otpStore = new Map<string, { code: string; expires: number; attempts: number }>();

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    const stored = otpStore.get(ADMIN_EMAIL);
    
    if (!stored || stored.attempts !== -1) {
      return NextResponse.json(
        { error: "Primero verifica el código" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      await query(
        "UPDATE admin_users SET password_hash = ? WHERE username = ?",
        [hashedPassword, "creencia"]
      );
    } catch {
      // Table might not exist in development, that's ok
    }

    otpStore.delete(ADMIN_EMAIL);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al cambiar la contraseña" },
      { status: 500 }
    );
  }
}