import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

/**
 * Secreto JWT. En producción es obligatorio que exista JWT_SECRET: sin él se
 * usaría un valor conocido públicamente y cualquiera podría forjar un token de
 * administrador. El fallback queda EXCLUSIVO para desarrollo/test.
 */
function getJwtSecret(): Uint8Array {
  const configured = process.env.JWT_SECRET;
  if (configured) {
    return new TextEncoder().encode(configured);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET no está configurado. Define la variable de entorno antes de desplegar."
    );
  }
  return new TextEncoder().encode("dev-only-fallback-secret-do-not-use-in-production");
}

const COOKIE_NAME = "cafe-creencia-session";

const SESSION_EXPIRY = "15m";

const isProduction = process.env.NODE_ENV === "production";

export interface JWTPayload {
  userId: number;
  username: string;
  email: string;
  iat: number;
  exp: number;
}

export async function createToken(payload: Omit<JWTPayload, "iat" | "exp">) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRY)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JWTPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  
  if (!token) return null;
  
  return verifyToken(token);
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function setSession(payload: Omit<JWTPayload, "iat" | "exp">) {
  const token = await createToken(payload);
  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export async function requireGuest() {
  const session = await getSession();
  if (session) {
    redirect("/admin");
  }
}