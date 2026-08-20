import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth/session";
import { handleApiError } from "./safe-error";
import { checkRateLimit, getClientKey, formatRateLimitError } from "./rate-limit";

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

  // Defensa CSRF por origen: si el navegador manda Origin (POST/PUT/DELETE),
  // debe coincidir con el host servido. Un atacante cross-site envía su propio
  // origen, que nunca coincide con el del sitio protegido.
  const originGuard = validateRequestOrigin(request);
  if (originGuard instanceof NextResponse) return originGuard;

  // Throttle de API autenticada por IP (limitado por minuto) para no saturar
  // el servidor en caso de abuso/scraping.
  const rateLimit = checkRateLimit(getClientKey(request), "api");
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: formatRateLimitError(rateLimit.resetIn) },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rateLimit.resetIn / 1000)) },
      }
    );
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

/**
 * Rechaza solicitudes con cabecera `Origin` que no coincida con el host
 * servido (defensa en profundidad contra CSRF). Sin cabecera Origin (clientes
 * no navegador, GET) se permite y queda cubierto por `sameSite: "lax"`.
 */
function validateRequestOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");

  if (!origin) {
    return null;
  }

  let originHostname: string | null = null;
  try {
    originHostname = new URL(origin).hostname;
  } catch {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  const hostHeader = request.headers.get("host") || request.nextUrl.host;
  const servedHostname = hostHeader.split(":")[0].toLowerCase();

  if (originHostname !== servedHostname) {
    return NextResponse.json({ error: "Origen no permitido" }, { status: 403 });
  }

  return null;
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