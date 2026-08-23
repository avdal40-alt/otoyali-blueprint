const INTERNAL_RETURN_ORIGIN = "https://auth-return.internal.invalid";
const FORBIDDEN_PATH_CHARACTERS = /[\u0000-\u001F\u007F\\]/;
const ENCODED_PATH_SEPARATOR = /%(?:25)*(?:2f|5c)/i;

export function safeNextPath(value: unknown, fallback = "/profile") {
  const safeFallback = isSafeInternalPath(fallback) ? normalizeInternalPath(fallback) : "/";

  if (!isSafeInternalPath(value)) {
    return safeFallback;
  }

  return normalizeInternalPath(value);
}

function isSafeInternalPath(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    return false;
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return false;
  }

  if (FORBIDDEN_PATH_CHARACTERS.test(value)) {
    return false;
  }

  const pathOnly = value.split(/[?#]/, 1)[0];
  if (ENCODED_PATH_SEPARATOR.test(pathOnly)) {
    return false;
  }

  try {
    const base = new URL(INTERNAL_RETURN_ORIGIN);
    const resolved = new URL(value, base);
    return (
      resolved.origin === base.origin &&
      resolved.pathname.startsWith("/") &&
      !resolved.pathname.startsWith("//") &&
      !FORBIDDEN_PATH_CHARACTERS.test(resolved.pathname)
    );
  } catch {
    return false;
  }
}

function normalizeInternalPath(value: string) {
  const resolved = new URL(value, INTERNAL_RETURN_ORIGIN);
  return `${resolved.pathname}${resolved.search}${resolved.hash}`;
}
