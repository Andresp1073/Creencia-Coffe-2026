import { NextResponse } from "next/server";
import { getSession, createToken, setSessionCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

/**
 * Extiende la sesión admin (inactividad controlada).
 *
 * Solo re-emite el JWT si la sesión actual es VÁLIDA: vuelca el mismo payload
 * (userId, username, email) en un token fresco con iat/exp renovados, de modo
 * que un cliente inactivo que decida continuar no queda expulsado por el exp.
 * Si la sesión ya no es válida (expired/ausente) responde 401 y el cliente
 * cierra la sesión localmente. No crea sesión nueva: sin session previa nunca
 * devuelve 200.
 */
export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false }, { status: 401 });
    }

    const token = await createToken({
      userId: session.userId,
      username: session.username,
      email: session.email,
    });

    const response = NextResponse.json({ success: true });
    setSessionCookie(response, token);
    return response;
  } catch {
    return NextResponse.json({ success: false }, { status: 401 });
  }
}