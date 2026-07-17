"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function SavedSearchButton() {
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

    const queryParams: Record<string, string | string[]> = {};
    searchParams.forEach((value, key) => {
      const existing = queryParams[key];
      if (!existing) {
        queryParams[key] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        queryParams[key] = [existing, value];
      }
    });

    setStatus("saving");
    setMessage("");

    const { error } = await supabase.schema("marketplace").from("saved_searches").insert({
      user_id: data.session.user.id,
      title: locale === "en" ? "OTOYALI search" : "OTOYALI araması",
      query_params: queryParams
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
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
