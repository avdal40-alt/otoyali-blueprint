"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Profile } from "@/lib/supabase/types";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";

export function ProfileClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
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
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .upsert({
        id: userId,
        phone: profile.phone,
        first_name: profile.first_name,
        last_name: profile.last_name,
        language: profile.language,
        country: profile.country,
        city: profile.city,
        timezone: profile.timezone,
        onboarding_completed_at: new Date().toISOString()
      }, { onConflict: "id" });

    if (updateError) {
      setError(updateError.message);
    }
  }

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) return <LoadingState />;
  if (!userId) return <EmptyState title="Profil icin giris yapin" body="Ilan yayinlamak, favorileri kaydetmek ve profil duzenlemek icin telefonla giris yapin." href="/login?next=/profile" action="Giris yap" />;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <h1 className="text-2xl font-black text-oto-text">Profil</h1>
        <p className="mt-1 text-sm text-oto-muted">{profile?.phone}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Input value={profile?.first_name ?? ""} onChange={(event) => setProfile((current) => current ? { ...current, first_name: event.target.value } : current)} placeholder="Ad" />
          <Input value={profile?.last_name ?? ""} onChange={(event) => setProfile((current) => current ? { ...current, last_name: event.target.value } : current)} placeholder="Soyad" />
          <Input value={profile?.city ?? ""} onChange={(event) => setProfile((current) => current ? { ...current, city: event.target.value } : current)} placeholder="Sehir" />
        </div>
        {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={save}>Kaydet</Button>
          <Button onClick={logout} variant="secondary">Cikis yap</Button>
        </div>
      </section>
      <aside className="grid h-fit gap-3 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <ButtonLink href="/profile/listings" variant="secondary">Ilanlarim</ButtonLink>
        <ButtonLink href="/favorites" variant="secondary">Favoriler</ButtonLink>
        <ButtonLink href="/settings" variant="secondary">Ayarlar</ButtonLink>
      </aside>
    </div>
  );
}
