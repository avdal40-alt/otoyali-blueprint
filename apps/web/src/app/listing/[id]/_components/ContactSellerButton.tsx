"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

export function ContactSellerButton() {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  async function contact() {
    if (!hasSupabaseEnv()) {
      alert(String(dictionary.errors.missingSupabaseEnv));
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push(`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath(pathname, locale))}`);
      return;
    }

    alert(locale === "en" ? "Seller contact will be available soon." : "Satıcı iletişim özelliği yakında aktif olacak.");
  }

  return (
    <Button onClick={contact} variant="orange" className="w-full">
      {String(dictionary.listing.contactSeller)}
    </Button>
  );
}
