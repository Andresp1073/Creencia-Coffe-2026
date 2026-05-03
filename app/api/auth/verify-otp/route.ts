import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "andresmauriciope1073@gmail.com";
const otpStore = new Map<string, { code: string; expires: number; attempts: number }>();
const MAX_ATTEMPTS = 3;

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    const stored = otpStore.get(ADMIN_EMAIL);

    if (!stored) {
      return NextResponse.json(
        { error: "No hay solicitud de recuperación activa" },
        { status: 400 }
      );
    }

    if (Date.now() > stored.expires) {
      otpStore.delete(ADMIN_EMAIL);
      return NextResponse.json(
        { error: "El código ha expirado. Solicita uno nuevo." },
        { status: 400 }
      );
    }

    if (stored.attempts >= MAX_ATTEMPTS) {
      otpStore.delete(ADMIN_EMAIL);
      return NextResponse.json(
        { error: "Demasiados intentos. Solicita un nuevo código." },
        { status: 400 }
      );
    }

    if (code !== stored.code) {
      stored.attempts++;
      return NextResponse.json(
        { error: `Código incorrecto. Te quedan ${MAX_ATTEMPTS - stored.attempts} intentos.` },
        { status: 400 }
      );
    }

    // Mark as verified
    stored.attempts = -1; // Special value to indicate verified

    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json(
      { error: "Error al verificar el código" },
      { status: 500 }
    );
  }
}