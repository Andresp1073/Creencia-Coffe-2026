import { NextRequest, NextResponse } from "next/server";
import { setOTP, ADMIN_EMAIL } from "@/lib/otp";

const ADMIN_EMAIL_CHECK = "andresmauriciope1073@gmail.com";

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmail(to: string, code: string) {
  const resendApiKey = process.env.RESEND_API_KEY;
  
  if (!resendApiKey) {
    console.log(`[EMAIL DISABLED] OTP for ${to}: ${code}`);
    return { success: true };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: "Café Creencia <onboarding@resend.dev>",
        to: [to],
        subject: "Código de recuperación - Café Creencia",
        html: `<html><body style="font-family: Arial, sans-serif; padding: 20px;"><div style="background: #F5F0E8; padding: 30px; border-radius: 12px;"><h2 style="color: #3E2723;">Recuperar contraseña</h2><p>Tu código de recuperación es:</p><div style="background: #fff; padding: 20px; border-radius: 8px; text-align: center;"><span style="font-size: 32px; letter-spacing: 8px; font-weight: bold;">${code}</span></div><p>Este código expira en 10 minutos.</p></div></body></html>`
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("Resend error:", error);
      return { success: false };
    }

    return { success: true };
  } catch (error) {
    console.error("Email error:", error);
    return { success: false };
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || email.toLowerCase() !== ADMIN_EMAIL_CHECK.toLowerCase()) {
      return NextResponse.json({ message: "Si el correo existe, se enviará un código" });
    }

    const code = generateOTP();
    setOTP(email, code);

    console.log("[FORGOT] OTP generated for:", email, "code:", code);

    const emailResult = await sendEmail(email, code);
    
    if (!emailResult.success) {
      return NextResponse.json({ error: "Error al enviar el código" }, { status: 500 });
    }

    return NextResponse.json({ message: "Código enviado" });
  } catch (error) {
    console.error("[FORGOT] Error:", error);
    return NextResponse.json({ error: "Error al enviar el código" }, { status: 500 });
  }
}