"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ErrorState, LoadingState } from "@/components/ui/States";

export function SettingsClient() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!hasSupabaseEnv()) {
        setError("Supabase ortam degiskenleri eksik.");
        return;
      }
      const supabase = getSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.replace("/login?next=/settings");
        return;
      }
      const { data } = await supabase.from("profiles").select("*").eq("id", userData.user.id).maybeSingle();
      setProfile((data as Profile | null) ?? null);
    }
    void load();
  }, [router]);

  async function save() {
    if (!profile) return;
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ first_name: profile.first_name, last_name: profile.last_name, city: profile.city, language: profile.language })
      .eq("id", profile.id);
    if (updateError) setError(updateError.message);
  }

  if (error) return <ErrorState message={error} />;
  if (!profile) return <LoadingState />;

  return (
    <div className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <div className="grid gap-3 md:grid-cols-2">
        <Input value={profile.first_name ?? ""} onChange={(event) => setProfile({ ...profile, first_name: event.target.value })} placeholder="Ad" />
        <Input value={profile.last_name ?? ""} onChange={(event) => setProfile({ ...profile, last_name: event.target.value })} placeholder="Soyad" />
        <Input value={profile.city ?? ""} onChange={(event) => setProfile({ ...profile, city: event.target.value })} placeholder="Sehir" />
        <Select value={profile.language} onChange={(event) => setProfile({ ...profile, language: event.target.value })}>
          <option value="tr">Turkce</option>
          <option value="en">English</option>
        </Select>
      </div>
      <Button onClick={save} className="mt-5">Ayarlari kaydet</Button>
    </div>
  );
}
