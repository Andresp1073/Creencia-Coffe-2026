export interface OTPData {
  code: string;
  expires: number;
  attempts: number;
  email: string;
  verifiedToken?: string;
}

// Global store - survives hot reload in dev mode
declare global {
  var __otpStore: Map<string, OTPData> | undefined;
}

const globalStore = globalThis.__otpStore || new Map<string, OTPData>();
globalThis.__otpStore = globalStore;
const otpStore = globalStore;

export const OTP_EXPIRY_MINUTES = 10;
export const MAX_ATTEMPTS = 3;
export const ADMIN_EMAIL = "andresmauriciope1073@gmail.com";

console.log("[OTP] Module initialized, store size:", otpStore.size);

export function setOTP(email: string, code: string): OTPData {
  const normalizedEmail = email.toLowerCase();
  const data: OTPData = {
    code,
    expires: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
    attempts: 0,
    email: normalizedEmail,
  };
  console.log("[OTP] setOTP for:", normalizedEmail, "code:", code, "store size:", otpStore.size);
  otpStore.set(normalizedEmail, data);
  return data;
}

export function getOTP(email: string): OTPData | undefined {
  const normalizedEmail = email.toLowerCase();
  const data = otpStore.get(normalizedEmail);
  console.log("[OTP] getOTP for:", normalizedEmail, "found:", !!data, "store size:", otpStore.size);
  if (!data) return undefined;
  
  if (Date.now() > data.expires) {
    otpStore.delete(normalizedEmail);
    return undefined;
  }
  
  return data;
}

export function deleteOTP(email: string): void {
  otpStore.delete(email.toLowerCase());
}

export function verifyOTP(email: string, code: string): { valid: boolean; error?: string; remaining?: number } {
  const normalizedEmail = email.toLowerCase();
  console.log("[OTP] verifyOTP for:", normalizedEmail, "code:", code, "store size:", otpStore.size);
  console.log("[OTP] store keys:", Array.from(otpStore.keys()));
  
  const data = getOTP(normalizedEmail);
  
  if (!data) {
    console.log("[OTP] No data found for email");
    return { valid: false, error: "No hay solicitud de recuperación activa" };
  }
  
  if (data.attempts >= MAX_ATTEMPTS) {
    deleteOTP(normalizedEmail);
    return { valid: false, error: "Demasiados intentos. Solicita un nuevo código." };
  }
  
  if (code !== data.code) {
    data.attempts++;
    const remaining = MAX_ATTEMPTS - data.attempts;
    return { valid: false, error: `Código incorrecto. Te quedan ${remaining} intentos.` };
  }
  
  data.verifiedToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
  data.attempts = -1;
  console.log("[OTP] Verified! Token generated");
  return { valid: true };
}

export function getVerifiedToken(email: string): string | undefined {
  const data = otpStore.get(email.toLowerCase());
  return data?.verifiedToken;
}

export function verifyToken(email: string, token: string): boolean {
  const data = otpStore.get(email.toLowerCase());
  const valid = data?.verifiedToken === token && data.attempts === -1;
  console.log("[OTP] verifyToken:", email, "valid:", valid);
  return valid;
}