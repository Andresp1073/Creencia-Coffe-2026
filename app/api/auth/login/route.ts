import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { setSession } from "@/lib/auth/session";
import { queryOne } from "@/lib/db";
import { checkRateLimit, getClientKey, formatRateLimitError } from "@/lib/security/rate-limit";
import { sanitizeString, isValidUsername } from "@/lib/security/sanitize";

interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
}

export async function POST(request: NextRequest) {
  try {
    const clientKey = getClientKey(request);
    const rateLimit = checkRateLimit(clientKey, "login");

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: formatRateLimitError(rateLimit.resetIn) },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)) } }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Solicitud inválida" },
        { status: 400 }
      );
    }

    const username = sanitizeString(body?.username, 50);
    const password = body?.password;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son requeridos" },
        { status: 400 }
      );
    }

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: "Usuario inválido" },
        { status: 400 }
      );
    }

    const user = await queryOne<AdminUser>(
      "SELECT id, username, password_hash FROM admin_users WHERE username = ?",
      [username]
    );

    if (user) {
      const valid = await bcrypt.compare(password, user.password_hash);
      if (valid) {
        await setSession({
          userId: user.id,
          username: user.username,
          email: "admin@cafecreencia.com",
        });
        return NextResponse.json({ success: true });
      }
    }

    return NextResponse.json(
      { error: "Credenciales incorrectas" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}