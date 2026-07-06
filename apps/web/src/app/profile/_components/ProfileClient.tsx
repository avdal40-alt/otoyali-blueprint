"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { City, Profile } from "@/lib/supabase/types";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { cityLabel } from "@/lib/format";

const fallbackCities = ["İstanbul", "Ankara", "İzmir", "Antalya"];

export function ProfileClient({ cities = [] }: { cities?: City[] }) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cityOptions = cities.map((city) => city.city_name?.trim()).filter(Boolean) as string[];
  const profileCities = cityOptions.length > 0 ? cityOptions : fallbackCities;

  useEffect(() => {
    async function load() {
      if (!hasSupabaseEnv()) {
        setError("Supabase ortam değişkenleri eksik.");
        setLoading(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      const fallbackProfile: Profile = {
        id: user.id,
        phone: user.phone ?? null,
        first_name: null,
        last_name: null,
        full_name: null,
        display_name: null,
        seller_type: "private",
        language: "tr",
        country: "TR",
        city: null,
        timezone: "Europe/Istanbul"
      };

      const { data, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (profileError) {
        setError(profileError.message);
      }
      setProfile((data as Profile | null) ?? fallbackProfile);
      setLoading(false);
    }

    void load();
  }, []);

  async function save() {
    if (!profile || !userId) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    const fullName = profile.full_name?.trim() || [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim();
    const displayName = profile.display_name?.trim() || fullName || profile.phone || "";
    const [firstName, ...lastNameParts] = fullName.split(" ").filter(Boolean);
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        phone: profile.phone,
        first_name: firstName || profile.first_name,
        last_name: lastNameParts.join(" ") || profile.last_name,
        full_name: fullName || null,
        display_name: displayName || null,
        seller_type: profile.seller_type || "private",
        language: profile.language,
        country: profile.country,
        city: profile.city,
        timezone: profile.timezone,
        onboarding_completed_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSaved(true);
      setProfile((current) => current ? { ...current, full_name: fullName, display_name: displayName } : current);
    }
    setSaving(false);
  }

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) return <LoadingState />;
  if (!userId) return <EmptyState title="Profil için giriş yapın" body="İlan yayınlamak, favorileri kaydetmek ve profil düzenlemek için telefonla giriş yapın." href="/login?next=/profile" action="Giriş yap" />;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <h1 className="text-2xl font-black text-oto-text">Profil</h1>
        <p className="mt-1 text-sm text-oto-muted">Satıcı profiliniz ilan yayınlama sırasında kullanılır.</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">Ad soyad</span>
            <Input value={profile?.full_name ?? ""} onChange={(event) => setProfile((current) => current ? { ...current, full_name: event.target.value } : current)} placeholder="Ad soyad" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">Görünen ad</span>
            <Input value={profile?.display_name ?? ""} onChange={(event) => setProfile((current) => current ? { ...current, display_name: event.target.value } : current)} placeholder="Görünen ad" />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">Telefon</span>
            <Input value={profile?.phone ?? ""} onChange={(event) => setProfile((current) => current ? { ...current, phone: event.target.value } : current)} placeholder="+905..." />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">Şehir</span>
            <Select value={profile?.city ?? ""} onChange={(event) => setProfile((current) => current ? { ...current, city: event.target.value } : current)}>
              <option value="">Şehir seçin</option>
              {profileCities.map((city) => <option key={city} value={city}>{cityLabel(city)}</option>)}
            </Select>
          </label>
          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs font-bold text-oto-muted">Satıcı tipi</span>
            <Select value={profile?.seller_type ?? "private"} onChange={(event) => setProfile((current) => current ? { ...current, seller_type: event.target.value } : current)}>
              <option value="private">Bireysel</option>
              <option value="dealer">Galeri</option>
            </Select>
          </label>
        </div>
        {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
        {saved ? <p className="mt-4 rounded-md bg-green-50 p-3 text-sm font-semibold text-oto-success">Profil kaydedildi.</p> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={save} disabled={saving}>{saving ? "Kaydediliyor" : "Kaydet"}</Button>
          <Button onClick={logout} variant="secondary">Çıkış yap</Button>
        </div>
      </section>
      <aside className="grid h-fit gap-3 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <ButtonLink href="/my-listings" variant="secondary">İlanlarım</ButtonLink>
        <ButtonLink href="/favorites" variant="secondary">Favoriler</ButtonLink>
        <ButtonLink href="/settings" variant="secondary">Ayarlar</ButtonLink>
      </aside>
    </div>
  );
}
