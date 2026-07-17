"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { ButtonLink } from "@/components/ui/Button";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function AppHeader() {
  const { locale, dictionary } = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isAuthed, setIsAuthed] = useState(false);
  const query = searchParams.toString();
  const currentHref = `${pathname}${query ? `?${query}` : ""}`;
  const profilePath = localizePath("/profile", locale);
  const loginProfilePath = `${localizePath("/login", locale)}?next=${encodeURIComponent(profilePath)}`;

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => setIsAuthed(Boolean(data.session)));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setIsAuthed(Boolean(session)));

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-oto-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6 lg:px-8">
        <Link href={localizePath("/", locale)} className="flex items-center" aria-label="otoyali home">
          <Image src="/brand/otoyali-logo-header.svg" alt="otoyali" width={146} height={35} priority className="h-8 w-auto" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-oto-muted md:flex">
          <Link href={localizePath("/search", locale)} className="hover:text-oto-text">
            {String(dictionary.navigation.buyVehicle)}
          </Link>
          <Link href={localizePath("/video", locale)} className="hover:text-oto-text">
            {String(dictionary.navigation.video)}
          </Link>
          <Link href={localizePath("/#kategoriler", locale)} className="hover:text-oto-text">
            {String(dictionary.navigation.categories)}
          </Link>
          <Link href={localizePath("/favorites", locale)} className="hover:text-oto-text">
            {String(dictionary.navigation.favorites)}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden rounded-full border border-oto-border p-1 text-xs font-bold md:flex" aria-label={String(dictionary.common.language)}>
            <Link
              href={localizePath(currentHref, "tr", { forceDefaultLocalePrefix: true })}
              className={locale === "tr" ? "rounded-full bg-oto-text px-2 py-1 text-white" : "px-2 py-1 text-oto-muted"}
              hrefLang="tr"
            >
              Türkçe
            </Link>
            <Link
              href={localizePath(currentHref, "en")}
              className={locale === "en" ? "rounded-full bg-oto-text px-2 py-1 text-white" : "px-2 py-1 text-oto-muted"}
              hrefLang="en"
            >
              English
            </Link>
          </div>
          <Link href={localizePath("/notifications", locale)} className="rounded-full p-2 text-oto-muted hover:bg-oto-surface" aria-label={String(dictionary.navigation.notifications)}>
            <BellIcon />
          </Link>
          <Link href={isAuthed ? profilePath : loginProfilePath} className="rounded-full p-2 text-oto-muted hover:bg-oto-surface" aria-label={String(dictionary.navigation.profile)}>
            <UserIcon />
          </Link>
          <ButtonLink href={localizePath("/sell", locale)} variant="orange" className="hidden md:inline-flex">
            {String(dictionary.common.publishListing)}
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 9A6 6 0 0 0 6 9c0 7-3 7-3 9h18c0-2-3-2-3-9Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M10 21h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
