import "server-only";

const REDACTED = "[redacted]";
const SENSITIVE_KEY = /(?:password|token|secret|authorization|cookie|email|phone|name|address|user_?id|listing_?id|contact|prompt|response|body|content|description|path)/i;
const PHONE = /(?:\+?\d[\d\s().-]{7,}\d)/g;
const EMAIL = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;

export type SafeLogFields = Record<string, unknown>;

export function redactLogValue(value: unknown, key = ""): unknown {
  if (SENSITIVE_KEY.test(key)) return REDACTED;
  if (typeof value === "string") return value.replace(EMAIL, REDACTED).replace(PHONE, REDACTED).slice(0, 500);
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redactLogValue(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).slice(0, 50).map(([childKey, childValue]) => [childKey, redactLogValue(childValue, childKey)]));
  }
  return value;
}

export function safeLog(level: "info" | "warn" | "error", event: string, fields: SafeLogFields = {}) {
  const payload = { level, event: event.slice(0, 120), ...redactLogValue(fields) as SafeLogFields };
  const output = JSON.stringify(payload);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.info(output);
}
