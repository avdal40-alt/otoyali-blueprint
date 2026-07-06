"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { ButtonLink } from "@/components/ui/Button";

export function AppHeader() {
  const [isAuthed, setIsAuthed] = useState(false);

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
        <Link href="/" className="flex items-center" aria-label="otoyali home">
          <Image src="/brand/otoyali-logo-header.svg" alt="otoyali" width={146} height={35} priority className="h-8 w-auto" />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-oto-muted md:flex">
          <Link href="/search" className="hover:text-oto-text">
            Ara
          </Link>
          <Link href="/akis" className="hover:text-oto-text">
            Akış
          </Link>
          <Link href="/news" className="hover:text-oto-text">
            Haberler
          </Link>
          <Link href="/about" className="hover:text-oto-text">
            Hakkında
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <div className="hidden rounded-full border border-oto-border p-1 text-xs font-bold md:flex">
            <Link href="/tr" className="rounded-full bg-oto-text px-2 py-1 text-white">
              TR
            </Link>
            <Link href="/en" className="px-2 py-1 text-oto-muted">
              EN
            </Link>
          </div>
          <Link href="/notifications" className="rounded-full p-2 text-oto-muted hover:bg-oto-surface" aria-label="Bildirimler">
            <BellIcon />
          </Link>
          <Link href={isAuthed ? "/profile" : "/login?next=/profile"} className="rounded-full p-2 text-oto-muted hover:bg-oto-surface" aria-label="Profil">
            <UserIcon />
          </Link>
          <ButtonLink href="/sell" variant="orange" className="hidden md:inline-flex">
            İlan yayınla
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
