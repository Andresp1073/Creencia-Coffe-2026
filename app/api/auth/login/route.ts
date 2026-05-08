import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createToken, setSessionCookie } from "@/lib/auth/session";
import { queryOne } from "@/lib/db";
import { checkRateLimit, getClientKey, formatRateLimitError } from "@/lib/security/rate-limit";
import { sanitizeString, isValidUsername } from "@/lib/security/sanitize";

interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
}

export async function POST(request: NextRequest) {
  console.log("=== LOGIN REQUEST ===");
  try {
    const clientKey = getClientKey(request);
    const rateLimit = checkRateLimit(clientKey, "login");
    console.log("Rate limit check:", rateLimit.success);

    if (!rateLimit.success) {
      return NextResponse.json(
        { error: formatRateLimitError(rateLimit.resetIn) },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)) } }
      );
    }

    let body;
    try {
      body = await request.json();
      console.log("Body parsed:", body?.username);
    } catch {
      return NextResponse.json(
        { error: "Solicitud inválida" },
        { status: 400 }
      );
    }

    const username = sanitizeString(body?.username, 50);
    const password = body?.password;
    console.log("Username sanitized:", username);

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

    console.log("Querying database...");
    const user = await queryOne<AdminUser>(
      "SELECT id, username, password_hash FROM admin_users WHERE username = ?",
      [username]
    );
    console.log("User found:", !!user, user?.id);

    if (!user) {
      console.log("No user found with username:", username);
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    console.log("Password valid:", valid);
    
    if (!valid) {
      console.log("Password invalid for user:", username);
      return NextResponse.json(
        { error: "Credenciales incorrectas" },
        { status: 401 }
      );
    }

    // Create token and set cookie
    const token = await createToken({
      userId: user.id,
      username: user.username,
      email: "admin@cafecreencia.com",
    });
    console.log("Token created");
    
    const response = NextResponse.json({ success: true });
    setSessionCookie(response, token);
    console.log("Cookie set, returning response");
    
    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Error del servidor" },
      { status: 500 }
    );
  }
}