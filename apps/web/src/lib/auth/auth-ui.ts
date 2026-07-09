export function safeNextPath(value?: string | null, fallback = "/profile") {
  if (!value) return fallback;

  try {
    const decoded = decodeURIComponent(value);
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return fallback;
    if (decoded.includes("://")) return fallback;
    return decoded;
  } catch {
    return fallback;
  }
}

export function friendlyAuthError(message?: string | null) {
  const text = (message ?? "").toLowerCase();

  if (
    text.includes("sms") ||
    text.includes("provider") ||
    (text.includes("phone") && text.includes("disabled")) ||
    text.includes("unsupported")
  ) {
    return "SMS girişi şu anda yapılandırılmamış. Lütfen daha sonra tekrar deneyin.";
  }

  if (text.includes("invalid") || text.includes("token") || text.includes("otp") || text.includes("expired")) {
    return "Kod doğrulanamadı. Lütfen tekrar deneyin.";
  }

  if (text.includes("session") || text.includes("auth session missing")) {
    return "Oturum bulunamadı. Lütfen tekrar giriş yapın.";
  }

  return "İşlem tamamlanamadı. Lütfen tekrar deneyin.";
}

export function isMissingAuthSessionError(message?: string | null) {
  const text = (message ?? "").toLowerCase();
  return text.includes("auth session missing") || text.includes("session");
}
