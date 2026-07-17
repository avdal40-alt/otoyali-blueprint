"use client";

import Link from "next/link";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function MobileBottomNav() {
  const { locale, dictionary } = useI18n();
  const tabs = [
    { href: "/search", label: String(dictionary.common.search), icon: SearchIcon },
    { href: "/video", label: String(dictionary.navigation.video), icon: PlayIcon },
    { href: "/sell", label: String(dictionary.common.publishListing), icon: PlusIcon, cta: true },
    { href: "/favorites", label: String(dictionary.navigation.favorites), icon: HeartIcon },
    { href: "/profile", label: String(dictionary.navigation.profile), icon: UserIcon }
  ];

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-50 border-t border-oto-border bg-white md:hidden">
      <div className="grid h-16 grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={localizePath(tab.href, locale)} className="flex flex-col items-center justify-center gap-1 text-[11px] font-bold text-oto-muted">
              <span className={tab.cta ? "text-oto-orange" : "text-oto-blue"}>
                <Icon />
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function SearchIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="m16 16 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}

function PlusIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>;
}

function PlayIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><rect x="4" y="3" width="16" height="18" rx="5" stroke="currentColor" strokeWidth="2"/><path d="m10 9 6 3-6 3V9Z" fill="currentColor"/></svg>;
}

function HeartIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 21l8.8-8a5.2 5.2 0 0 0 0-7.4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>;
}

function UserIcon() {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none"><path d="M20 21a8 8 0 0 0-16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/></svg>;
}
