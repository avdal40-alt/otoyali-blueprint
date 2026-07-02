"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

export function ContactSellerButton() {
  const router = useRouter();
  const pathname = usePathname();

  async function contact() {
    if (!hasSupabaseEnv()) {
      alert("Supabase ortam degiskenleri eksik.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    alert("Satici ile iletisim ozelligi Sprint 1 sonrasi etkinlestirilecek.");
  }

  return (
    <Button onClick={contact} className="w-full">
      Satici ile iletisime gec
    </Button>
  );
}
