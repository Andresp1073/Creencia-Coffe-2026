const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, maxAttempts: 5 },
  "forgot-password": { windowMs: 60 * 60 * 1000, maxAttempts: 3 },
  "verify-otp": { windowMs: 15 * 60 * 1000, maxAttempts: 3 },
  "reset-password": { windowMs: 60 * 60 * 1000, maxAttempts: 3 },
  default: { windowMs: 60 * 1000, maxAttempts: 100 },
};

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetIn: number;
}

export function checkRateLimit(key: string, type: keyof typeof RATE_LIMITS = "default"): RateLimitResult {
  const config = RATE_LIMITS[type] || RATE_LIMITS.default;
  const now = Date.now();

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    });
    return {
      success: true,
      remaining: config.maxAttempts - 1,
      resetIn: config.windowMs,
    };
  }

  if (record.count >= config.maxAttempts) {
    return {
      success: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    };
  }

  record.count++;
  return {
    success: true,
    remaining: config.maxAttempts - record.count,
    resetIn: record.resetTime - now,
  };
}

export function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

export function formatRateLimitError(resetIn: number): string {
  const minutes = Math.ceil(resetIn / 60000);
  return `Demasiados intentos. Intenta de nuevo en ${minutes} minuto${minutes > 1 ? "s" : ""}.`;
}