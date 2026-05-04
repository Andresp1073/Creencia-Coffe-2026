import { NextRequest, NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/security/api-auth";

export async function POST(request: NextRequest) {
  const session = await requireApiAuth(request);
  if (session instanceof NextResponse) {
    return session;
  }
  try {
    const body = await request.json();
    const { to, subject, message } = body;

    if (!to || !subject || !message) {
      return NextResponse.json({ error: "Datos requeridos" }, { status: 400 });
    }

    const resendApiKey = process.env.RESEND_API_KEY;
    
    if (resendApiKey) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${resendApiKey}`
        },
        body: JSON.stringify({
          from: "Café Creencia <onboarding@resend.dev>",
          to: [to],
          subject: subject,
          html: `
            <html>
              <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2 style="color: #3E2723;">🚨 Alerta de Stock - Café Creencia</h2>
                <p>${message}</p>
                <p style="color: #666; font-size: 12px;">
                  Este es un correo automático. Por favor no responder.
                </p>
              </body>
            </html>
          `
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Resend error:", error);
        return NextResponse.json({ error: "Error al enviar email" }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: "Email enviado" });
    }

    console.log(`[EMAIL SIMULADO] Para: ${to}, Asunto: ${subject}, Mensaje: ${message}`);
    return NextResponse.json({ success: true, message: "Email simulado (API key no configurada)" });
  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json({ error: "Error al enviar email" }, { status: 500 });
  }
}