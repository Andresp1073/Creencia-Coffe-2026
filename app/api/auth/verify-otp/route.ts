import { NextRequest, NextResponse } from "next/server";
import { verifyOTP, getVerifiedToken, ADMIN_EMAIL } from "@/lib/otp";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    console.log("[VERIFY] Starting verification, code:", code, "admin email:", ADMIN_EMAIL);

    if (!code) {
      return NextResponse.json({ error: "Código requerido" });
    }

    const result = verifyOTP(ADMIN_EMAIL, code);

    console.log("[VERIFY] Result:", result);

    if (result.valid) {
      const token = getVerifiedToken(ADMIN_EMAIL);
      console.log("[VERIFY] Got token:", token);
      return NextResponse.json({ verified: true, token });
    }

    return NextResponse.json({ error: result.error });
  } catch (error) {
    console.error("[VERIFY] Error:", error);
    return NextResponse.json({ error: "Error al verificar el código" });
  }
}