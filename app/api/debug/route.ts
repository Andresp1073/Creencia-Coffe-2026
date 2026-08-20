import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireApiAuth } from "@/lib/security/api-auth";

/**
 * Endpoint de diagnóstico. Antes expuesto sin autenticación y devolvía un
 * fragmento del password_hash y String(error) (riesgo de fuga de credenciales
 * del usuario admin y de configuración de BD). Ahora exige sesión y NUNCA
 * devuelve hashes ni mensajes de error crudos.
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible" }, { status: 404 });
  }

  const auth = await requireApiAuth(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const user = await queryOne<{ id: number; username: string }>(
      "SELECT id, username FROM admin_users WHERE username = 'creencia' LIMIT 1"
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: { id: user.id, username: user.username } });
  } catch {
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}