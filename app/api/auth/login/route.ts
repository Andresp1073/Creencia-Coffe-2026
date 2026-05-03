import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { setSession } from "@/lib/auth/session";
import { queryOne } from "@/lib/db";

interface AdminUser {
  id: number;
  username: string;
  password_hash: string;
}

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Usuario y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Try to find user in database
    try {
      const user = await queryOne<AdminUser>(
        "SELECT * FROM admin_users WHERE username = ?",
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
    } catch (dbError) {
      console.log("Database error:", dbError);
    }

    // Fallback: accept hardcoded credentials for development
    if (username === "creencia" && password === "cafe2024admin") {
      await setSession({
        userId: 1,
        username: "creencia",
        email: "admin@cafecreencia.com",
      });
      return NextResponse.json({ success: true });
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