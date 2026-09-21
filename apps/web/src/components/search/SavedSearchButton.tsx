"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function SavedSearchButton({ request }: { request: Record<string, unknown> }) {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState("");

  async function saveSearch() {
    const query = searchParams.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;

    if (!hasSupabaseEnv()) {
      setStatus("error");
      setMessage(String(dictionary.errors.missingSupabaseEnv));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      router.push(`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath(nextUrl, locale))}`);
      return;
    }

    setStatus("saving");
    setMessage("");

    let response: Response;
    try {
      response = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ request, title: locale === "en" ? "OTOYALI search" : "OTOYALI araması", alertEnabled: false })
      });
    } catch {
      setStatus("error");
      setMessage(locale === "en" ? "Your search could not be saved." : "Aramanız kaydedilemedi.");
      return;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: unknown } | null;
      setStatus("error");
      setMessage(typeof body?.error === "string" ? body.error : (locale === "en" ? "Your search could not be saved." : "Aramanız kaydedilemedi."));
      return;
    }

    setStatus("saved");
    setMessage(locale === "en" ? "Your search was saved. New listing notifications are coming soon." : "Aramanız kaydedildi. Yeni ilan bildirimleri yakında.");
  }

  return (
    <div className="grid gap-2">
      <Button type="button" variant="secondary" onClick={saveSearch} disabled={status === "saving"} className="h-10">
        {status === "saving" ? (locale === "en" ? "Saving" : "Kaydediliyor") : String(dictionary.search.saveSearch)}
      </Button>
      {message ? (
        <p className={status === "error" ? "text-xs font-semibold text-oto-danger" : "text-xs font-semibold text-oto-blue"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
