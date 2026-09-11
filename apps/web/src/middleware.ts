import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  isSupportedLocale,
  localizePath,
  pickLocaleFromAcceptLanguage,
  rewriteLocalePath,
  stripLocalePrefix
} from "./i18n/config";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const MAINTENANCE_PATH = "/maintenance";

function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

  if (process.env.NEXT_PUBLIC_YOLMOD_CUTOVER_MODE === "maintenance") {
    if (isApiPath(pathname)) {
      return NextResponse.json(
        { error: "Service temporarily unavailable" },
        { status: 503, headers: { "Retry-After": "60", "Cache-Control": "no-store" } }
      );
    }

    // The route handler owns the final 503 response. A status on a rewrite is
    // not preserved when Next.js renders the rewritten App Router page.
    if (pathname === MAINTENANCE_PATH) {
      return NextResponse.next();
    }

    url.pathname = MAINTENANCE_PATH;
    url.search = "";
    return NextResponse.rewrite(url);
  }

  // This is a terminal route, not a locale-specific public page.
  if (pathname === MAINTENANCE_PATH) {
    return NextResponse.next();
  }

  // API handlers and the OAuth callback are routing boundaries, not public pages.
  // They must retain their canonical paths and (for callbacks) their query string.
  if (isApiPath(pathname) || pathname === "/auth/callback") {
    return NextResponse.next();
  }

  if (pathname === "/akis" || pathname.startsWith("/akis/")) {
    url.pathname = "/video";
    return NextResponse.redirect(url);
  }

  if (pathname === "/en/akis" || pathname.startsWith("/en/akis/")) {
    url.pathname = "/en/video";
    return NextResponse.redirect(url);
  }

  const { locale: pathLocale } = stripLocalePrefix(pathname);
  const rawCookieLocale = request.cookies.get(LOCALE_COOKIE_NAME)?.value;
  // An unreleased or malformed cookie is not an explicit preference and must
  // never suppress valid Accept-Language negotiation.
  const cookieLocale = isSupportedLocale(rawCookieLocale) ? rawCookieLocale : null;
  const acceptLocale = pickLocaleFromAcceptLanguage(request.headers.get("accept-language"));
  const locale = pathLocale ?? cookieLocale ?? acceptLocale ?? DEFAULT_LOCALE;
  request.cookies.set(LOCALE_COOKIE_NAME, locale);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER_NAME, locale);

  if (pathLocale === "tr") {
    url.pathname = rewriteLocalePath(pathname);
    const response = NextResponse.redirect(url);
    setLocaleCookie(response, "tr");
    return response;
  }

  if (pathLocale === "en") {
    url.pathname = rewriteLocalePath(pathname);
    const response = NextResponse.rewrite(url, {
      request: {
        headers: requestHeaders
      }
    });
    setLocaleCookie(response, "en");
    return response;
  }

  if (!cookieLocale && acceptLocale === "en") {
    const target = localizePath(`${pathname}${url.search}`, "en");
    const targetUrl = new URL(target, request.url);
    url.pathname = targetUrl.pathname;
    url.search = targetUrl.search;
    const response = NextResponse.redirect(url);
    setLocaleCookie(response, "en");
    return response;
  }

  const response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  if (!cookieLocale) {
    setLocaleCookie(response, acceptLocale ?? DEFAULT_LOCALE);
  }

  return response;
}

function setLocaleCookie(response: NextResponse, locale: "tr" | "en") {
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: "/",
    sameSite: "lax",
    maxAge: LOCALE_COOKIE_MAX_AGE
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|brand|manifest.webmanifest|.*\\..*).*)"]
};
