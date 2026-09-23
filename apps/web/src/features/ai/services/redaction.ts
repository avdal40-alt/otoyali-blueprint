import "server-only";
const sensitive = [/(?:\+?\d[\d\s().-]{7,}\d)/g, /\b[A-Z0-9]{17}\b/gi, /\b[\w.+-]+@[\w.-]+\.[A-Z]{2,}\b/gi, /https?:\/\/[^\s]+/gi, /(?:authorization|bearer|service_role|signedUrl|storage_path)\s*[:=]\s*[^\s,]+/gi];
export function redactAiOutboundText(value: string) { return sensitive.reduce((text, pattern) => text.replace(pattern, "[redacted]"), value).slice(0, 6000); }
export function redactAiOutbound<T>(value: T): T { return JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "string" ? redactAiOutboundText(item) : item)) as T; }
