"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/format";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";

type MyListing = {
  id: string;
  title: string;
  status: string;
  price_amount: number;
  currency: string;
  city: string;
};

export function MyListingsClient() {
  const router = useRouter();
  const [items, setItems] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!hasSupabaseEnv()) {
        setError("Supabase ortam degiskenleri eksik.");
        setLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login?next=/profile/listings");
        return;
      }

      const { data, error: listingError } = await supabase
        .schema("marketplace")
        .from("listings")
        .select("id,title,status,price_amount,currency,city")
        .eq("seller_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (listingError) {
        setError(listingError.message);
      }
      setItems((data ?? []) as MyListing[]);
      setLoading(false);
    }

    void load();
  }, [router]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (items.length === 0) return <EmptyState title="Henuz ilan yok" body="Ilk ilaninizla OTOYALI'de gorunur olun." href="/sell" action="Ilan yayinla" />;

  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <a key={item.id} href={`/listing/${item.id}`} className="rounded-oto border border-oto-border bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="font-bold text-oto-text">{item.title}</h2>
              <p className="mt-1 text-sm text-oto-muted">{item.city} - {item.status}</p>
            </div>
            <p className="font-black text-oto-text">{formatPrice(item.price_amount, item.currency)}</p>
          </div>
        </a>
      ))}
    </div>
  );
}
