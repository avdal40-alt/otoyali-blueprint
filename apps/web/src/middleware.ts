import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_NAME,
  LOCALE_HEADER_NAME,
  localizePath,
  normalizeLocale,
  pickLocaleFromAcceptLanguage,
  rewriteLocalePath,
  stripLocalePrefix
} from "./i18n/config";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const pathname = url.pathname;

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
  const cookieLocale = rawCookieLocale ? normalizeLocale(rawCookieLocale) : null;
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

  if (!rawCookieLocale && acceptLocale === "en") {
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

  if (!request.cookies.get(LOCALE_COOKIE_NAME)?.value && acceptLocale) {
    setLocaleCookie(response, acceptLocale);
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
