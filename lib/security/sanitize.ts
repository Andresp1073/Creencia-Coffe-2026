export function sanitizeString(input: unknown, maxLength: number = 255): string {
  if (typeof input !== "string") return "";
  return input.slice(0, maxLength).replace(/[<>]/g, "");
}

export function sanitizeSlug(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 100);
}

export function sanitizeNumericId(input: unknown): number | null {
  const num = Number(input);
  if (isNaN(num) || num < 1 || !Number.isInteger(num)) return null;
  return num;
}

export function sanitizeHtml(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .slice(0, 5000);
}

export function sanitizeUrl(input: unknown): string {
  if (typeof input !== "string") return "";
  try {
    const url = new URL(input);
    if (["http:", "https:"].includes(url.protocol)) {
      return input.slice(0, 2048);
    }
  } catch {}
  return "";
}

export function isValidEmail(email: unknown): boolean {
  if (typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

export function isValidPassword(password: unknown): boolean {
  if (typeof password !== "string") return false;
  return password.length >= 8 && password.length <= 128;
}

export function isValidUsername(username: unknown): boolean {
  if (typeof username !== "string") return false;
  return /^[a-zA-Z0-9_]{3,30}$/.test(username);
}