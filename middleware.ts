import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/recuperar-password", "/api/auth", "/api/products", "/catalogo", "/producto", "/nosotros", "/"];
const ADMIN_PREFIX = "/admin";
const COOKIE_NAME = "cafe-creencia-session";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,
  sameSite: "lax" as const,
  path: "/" as string,
};

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, no-transform",
  "Pragma": "no-cache",
  "Expires": "0",
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  if (pathname.startsWith("/api/")) {
    const isPublicApi = PUBLIC_PATHS.some(path => 
      pathname === path || pathname.startsWith(path + "/")
    );

    if (!isPublicApi && pathname.startsWith("/api/admin/")) {
      if (!token) {
        return NextResponse.json(
          { error: "No autorizado" },
          { status: 401, headers: { ...SECURITY_HEADERS, ...CACHE_HEADERS } }
        );
      }
      const session = await verifyToken(token);
      if (!session) {
        return NextResponse.json(
          { error: "Sesión inválida" },
          { status: 401, headers: { ...SECURITY_HEADERS, ...CACHE_HEADERS } }
        );
      }
    }

    const response = NextResponse.next();
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    Object.entries(CACHE_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const session = await verifyToken(token);
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      return NextResponse.redirect(loginUrl);
    }

    const response = NextResponse.next();
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    Object.entries(CACHE_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    return response;
  }

  const response = NextResponse.next();
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

export const config = {
  matcher: [
    '/((?!api/_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};