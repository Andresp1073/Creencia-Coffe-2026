import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/session";
import { handleApiError } from "./safe-error";

const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/verify-otp",
  "/api/auth/reset-password",
  "/api/products",
  "/api/admin/categories",
];

export async function requireApiAuth(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (PUBLIC_API_PATHS.some((path) => pathname.startsWith(path))) {
    return null;
  }

  const token = request.cookies.get("cafe-creencia-session")?.value;

  if (!token) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  const session = await verifyToken(token);

  if (!session) {
    return NextResponse.json(
      { error: "Sesión inválida" },
      { status: 401 }
    );
  }

  return session;
}

export function withAuth<T = unknown>(
  handler: (request: NextRequest, session: T) => Promise<NextResponse>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authResult = await requireApiAuth(request);

    if (authResult instanceof NextResponse) {
      return authResult;
    }

    try {
      return await handler(request, authResult as T);
    } catch (error) {
      const { error: message, statusCode } = handleApiError(error);
      return NextResponse.json({ error: message }, { status: statusCode });
    }
  };
}

export function withAuthAndValidation<T>(
  handler: (request: NextRequest, session: T, body: unknown) => Promise<NextResponse>,
  validate: (body: unknown) => { success: boolean; data?: unknown; error?: string }
) {
  return withAuth<T>(async (request, session) => {
    try {
      const body = await request.json();
      const validation = validate(body);

      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error || "Datos inválidos" },
          { status: 400 }
        );
      }

      return await handler(request, session, validation.data);
    } catch {
      return NextResponse.json(
        { error: "Error al procesar la solicitud" },
        { status: 400 }
      );
    }
  });
}