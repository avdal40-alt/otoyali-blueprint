"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";

export function ContactSellerButton() {
  const router = useRouter();
  const pathname = usePathname();

  async function contact() {
    if (!hasSupabaseEnv()) {
      alert("Supabase ortam değişkenleri eksik.");
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    alert("Satıcı iletişim özelliği yakında aktif olacak.");
  }

  return (
    <Button onClick={contact} variant="orange" className="w-full">
      Satıcı ile iletişime geç
    </Button>
  );
}
