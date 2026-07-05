"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

export function SavedSearchButton() {
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
      setMessage("Supabase ortam değişkenleri eksik.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) {
      router.push(`/login?next=${encodeURIComponent(nextUrl)}`);
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
      title: "OTOYALI araması",
      query_params: queryParams
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("saved");
    setMessage("Aramanız kaydedildi. Yeni ilan bildirimleri yakında.");
  }

  return (
    <div className="grid gap-2">
      <Button type="button" variant="secondary" onClick={saveSearch} disabled={status === "saving"} className="h-10">
        {status === "saving" ? "Kaydediliyor" : "Aramayı kaydet"}
      </Button>
      {message ? (
        <p className={status === "error" ? "text-xs font-semibold text-oto-danger" : "text-xs font-semibold text-oto-blue"}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
