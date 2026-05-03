import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = "andresmauriciope1073@gmail.com";
const otpStore = new Map<string, { code: string; expires: number; attempts: number }>();

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || email.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      // Don't reveal if email exists
      return NextResponse.json({ message: "Si el correo existe, se enviará un código" });
    }

    const code = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email.toLowerCase(), {
      code,
      expires,
      attempts: 0,
    });

    // In production, send email with Resend
    console.log(`OTP for ${email}: ${code}`);

    return NextResponse.json({ message: "Código enviado" });
  } catch (error) {
    return NextResponse.json(
      { error: "Error al enviar el código" },
      { status: 500 }
    );
  }
}