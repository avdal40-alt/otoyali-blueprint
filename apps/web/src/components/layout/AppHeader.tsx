"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { ButtonLink } from "@/components/ui/Button";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import {
  platformStaffNavigationAction,
  usePlatformStaffNavigation
} from "./PlatformStaffNavigation";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";

export function AppHeader() {
  const { locale, dictionary } = useI18n();
  const pathname = usePathname();
  const [isAuthed, setIsAuthed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const marketplaceAction = platformStaffNavigationAction(usePlatformStaffNavigation());
  const profilePath = localizePath("/profile", locale);
  const loginProfilePath = `${localizePath("/login", locale)}?next=${encodeURIComponent(profilePath)}`;

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const loadUnread = async (token: string | undefined) => {
      if (!token) return setUnreadCount(0);
      try {
        const response = await fetch("/api/notifications/unread-count", { cache: "no-store", headers: { Authorization: `Bearer ${token}` } });
        const payload = await response.json() as { data?: { count?: number } };
        setUnreadCount(response.ok && Number.isSafeInteger(payload.data?.count) ? Math.max(0, payload.data!.count!) : 0);
      } catch { setUnreadCount(0); }
    };
    supabase.auth.getSession().then(({ data }) => {
      setIsAuthed(Boolean(data.session));
      void loadUnread(data.session?.access_token);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthed(Boolean(session));
      void loadUnread(session?.access_token);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-oto-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-4 md:px-6 lg:px-8">
        <Link href={localizePath("/", locale)} className="flex rounded-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oto-blue" aria-label="Jolmod home">
          <span className="text-xl font-black tracking-tight text-oto-text sm:text-3xl">Jolmod</span>
        </Link>
        <nav aria-label={String(dictionary.navigation.categories)} className="hidden items-center gap-5 text-sm font-semibold text-oto-muted lg:flex">
          <HeaderNavigationLink href="/search" locale={locale} pathname={pathname}>{String(dictionary.navigation.buyVehicle)}</HeaderNavigationLink>
          <HeaderNavigationLink href="/video" locale={locale} pathname={pathname}>{String(dictionary.navigation.video)}</HeaderNavigationLink>
          <HeaderNavigationLink href="/#kategoriler" locale={locale} pathname={pathname}>{String(dictionary.navigation.categories)}</HeaderNavigationLink>
          <HeaderNavigationLink href="/favorites" locale={locale} pathname={pathname}>{String(dictionary.navigation.favorites)}</HeaderNavigationLink>
          <span className="hidden items-center gap-5 lg:contents">
            <HeaderNavigationLink href="/yedek-parca" locale={locale} pathname={pathname}>{String(dictionary.navigation.parts)}</HeaderNavigationLink>
            <HeaderNavigationLink href="/servisler" locale={locale} pathname={pathname}>{String(dictionary.navigation.services)}</HeaderNavigationLink>
          </span>
        </nav>
        <div className="flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link href={isAuthed ? localizePath("/notifications", locale) : `${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath("/notifications", locale))}`} className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-oto-muted transition hover:bg-oto-surface hover:text-oto-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oto-blue" aria-label={unreadCount > 0 ? `${String(dictionary.navigation.notifications)} (${unreadCount})` : String(dictionary.navigation.notifications)}>
            <BellIcon />
            {isAuthed && unreadCount > 0 ? <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-oto-orange px-1 text-center text-[10px] font-black leading-4 text-white" aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span> : null}
          </Link>
          <Link href={isAuthed ? profilePath : loginProfilePath} className="flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-oto-muted transition hover:bg-oto-surface hover:text-oto-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-oto-blue" aria-label={String(dictionary.navigation.profile)}>
            <UserIcon />
          </Link>
          {marketplaceAction ? (
            <ButtonLink
              href={localizePath(marketplaceAction === "admin" ? "/admin" : "/sell", locale)}
              variant="orange"
              className="hidden lg:inline-flex"
            >
              {marketplaceAction === "admin"
                ? String(dictionary.common.adminPanel)
                : String(dictionary.common.publishListing)}
            </ButtonLink>
          ) : (
            <span aria-hidden="true" className="invisible hidden h-11 w-32 lg:inline-flex" />
          )}
        </div>
      </div>
    </header>
  );
}

function HeaderNavigationLink({
  href,
  locale,
  pathname,
  children
}: {
  href: string;
  locale: Parameters<typeof localizePath>[1];
  pathname: string;
  children: React.ReactNode;
}) {
  const localizedHref = localizePath(href, locale);
  const targetPath = localizedHref.split(/[?#]/, 1)[0];
  const isCurrent = href !== "/#kategoriler" && pathname === targetPath;

  return (
    <Link
      href={localizedHref}
      aria-current={isCurrent ? "page" : undefined}
      className={`rounded-sm transition hover:text-oto-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-oto-blue ${isCurrent ? "text-oto-text" : ""}`}
    >
      {children}
    </Link>
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
