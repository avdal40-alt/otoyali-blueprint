"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { cityLabel, formatPrice } from "@/lib/format";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SafeImage } from "@/components/ui/SafeImage";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";

type MyListing = {
  id: string;
  vehicle_profile_id: string;
  title: string;
  status: string;
  price_amount: number;
  currency: string;
  city: string;
  quality_score?: number | null;
  make_name?: string | null;
  model_name?: string | null;
  year?: number | null;
  cover_image_url?: string | null;
};

export function MyListingsClient() {
  const router = useRouter();
  const [items, setItems] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!hasSupabaseEnv()) {
        setError("Supabase ortam değişkenleri eksik.");
        setLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login?next=/my-listings");
        return;
      }

      const { data, error: listingError } = await supabase
        .schema("marketplace")
        .from("listings")
        .select("id,vehicle_profile_id,title,status,price_amount,currency,city,quality_score")
        .eq("seller_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (listingError) {
        setError(listingError.message);
        setLoading(false);
        return;
      }

      const listingRows = (data ?? []) as MyListing[];
      const profileIds = listingRows.map((item) => item.vehicle_profile_id).filter(Boolean);
      if (profileIds.length === 0) {
        setItems(listingRows);
        setLoading(false);
        return;
      }

      const [{ data: profiles }, { data: media }] = await Promise.all([
        supabase
          .schema("vehicle")
          .from("vehicle_profiles")
          .select("id,make_id,model_id,year")
          .in("id", profileIds),
        supabase
          .schema("vehicle")
          .from("profile_media")
          .select("vehicle_profile_id,url,is_cover,sort_order")
          .in("vehicle_profile_id", profileIds)
          .order("is_cover", { ascending: false })
          .order("sort_order", { ascending: true })
      ]);

      const profileRows = (profiles ?? []) as Array<{ id: string; make_id: string; model_id: string; year: number | null }>;
      const makeIds = Array.from(new Set(profileRows.map((profile) => profile.make_id).filter(Boolean)));
      const modelIds = Array.from(new Set(profileRows.map((profile) => profile.model_id).filter(Boolean)));
      const [{ data: makes }, { data: models }] = await Promise.all([
        makeIds.length > 0 ? supabase.schema("vehicle").from("makes").select("id,name").in("id", makeIds) : Promise.resolve({ data: [] }),
        modelIds.length > 0 ? supabase.schema("vehicle").from("models").select("id,name").in("id", modelIds) : Promise.resolve({ data: [] })
      ]);

      const profilesById = new Map(profileRows.map((profile) => [profile.id, profile]));
      const makesById = new Map(((makes ?? []) as Array<{ id: string; name: string }>).map((make) => [make.id, make.name]));
      const modelsById = new Map(((models ?? []) as Array<{ id: string; name: string }>).map((model) => [model.id, model.name]));
      const mediaByProfile = new Map<string, string>();
      for (const item of (media ?? []) as Array<{ vehicle_profile_id: string; url: string | null }>) {
        if (item.url && !mediaByProfile.has(item.vehicle_profile_id)) {
          mediaByProfile.set(item.vehicle_profile_id, item.url);
        }
      }

      setItems(
        listingRows.map((item) => {
          const profile = profilesById.get(item.vehicle_profile_id);
          return {
            ...item,
            make_name: profile?.make_id ? makesById.get(profile.make_id) : null,
            model_name: profile?.model_id ? modelsById.get(profile.model_id) : null,
            year: profile?.year ?? null,
            cover_image_url: mediaByProfile.get(item.vehicle_profile_id) ?? null
          };
        })
      );
      setLoading(false);
    }

    void load();
  }, [router]);

  async function setStatus(listingId: string, status: "active" | "paused") {
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .schema("marketplace")
      .from("listings")
      .update({ status })
      .eq("id", listingId);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setItems((current) => current.map((item) => item.id === listingId ? { ...item, status } : item));
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (items.length === 0) return <EmptyState title="Henüz ilanınız yok." body="İlk ilanınızı yayınlayın." href="/sell" action="İlan yayınla" />;

  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <article key={item.id} className="overflow-hidden rounded-oto border border-oto-border bg-white shadow-soft">
          <div className="grid gap-4 p-3 sm:grid-cols-[180px_1fr]">
            <div className="aspect-[4/3] overflow-hidden rounded-md bg-oto-surface">
              <SafeImage src={item.cover_image_url} alt={item.title} />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-oto-muted">{statusLabel(item.status)}</p>
                  <h2 className="mt-1 text-lg font-black text-oto-text">{item.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-oto-muted">
                    {[item.make_name, item.model_name, item.year].filter(Boolean).join(" ") || "Araç bilgileri"}
                  </p>
                </div>
                <p className="text-lg font-black text-oto-text">{formatPrice(item.price_amount, item.currency)}</p>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-oto-muted">
                <span className="rounded-full bg-oto-surface px-3 py-1">{cityLabel(item.city)}</span>
                <span className="rounded-full bg-oto-surface px-3 py-1">İlan kalitesi: {item.quality_score ?? 0}%</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.status === "active" ? (
                  <ButtonLink href={`/listing/${item.id}`} variant="secondary">Görüntüle</ButtonLink>
                ) : (
                  <Button type="button" variant="secondary" disabled>Görüntüle</Button>
                )}
                <Button type="button" variant="secondary" disabled>Düzenle · Yakında</Button>
                {item.status === "active" ? (
                  <Button type="button" variant="secondary" onClick={() => setStatus(item.id, "paused")}>Duraklat</Button>
                ) : item.status === "paused" ? (
                  <Button type="button" variant="secondary" onClick={() => setStatus(item.id, "active")}>Yeniden yayınla</Button>
                ) : null}
              </div>
            </div>
          </div>
        </article>
      ))}
      <div>
        <Link href="/sell" className="text-sm font-black text-oto-blue">Yeni ilan yayınla</Link>
      </div>
    </div>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    active: "Aktif",
    draft: "Taslak",
    paused: "Duraklatıldı",
    sold: "Satıldı",
    removed: "Kaldırıldı"
  };

  return labels[status] ?? status;
}
