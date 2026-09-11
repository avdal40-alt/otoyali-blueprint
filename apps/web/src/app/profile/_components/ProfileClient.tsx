"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { City, Profile } from "@/lib/supabase/types";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import { normalizeStoredAuthPhoneToE164 } from "@/lib/auth/phone";
import { cityLabel } from "@/lib/format";

const fallbackCities = ["İstanbul", "Ankara", "İzmir", "Antalya"];

export function ProfileClient({ cities = [] }: { cities?: City[] }) {
  const router = useRouter();
  const { locale, dictionary } = useI18n();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [listingCount, setListingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cityOptions = cities.map((city) => city.city_name?.trim()).filter(Boolean) as string[];
  const profileCities = cityOptions.length > 0 ? cityOptions : fallbackCities;

  useEffect(() => {
    async function load() {
      if (!hasSupabaseEnv()) {
        setError(String(dictionary.errors.authConfiguration));
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
      setCreatedAt(user.created_at ?? null);
      const fallbackProfile: Profile = {
        id: user.id,
        phone: normalizeStoredAuthPhoneToE164(user.phone),
        first_name: null,
        last_name: null,
        full_name: null,
        display_name: null,
        seller_type: "private",
        language: locale,
        country: "TR",
        city: null,
        timezone: "Europe/Istanbul"
      };

      const { data, error: profileError } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (profileError) {
        logClientError("profile.load", profileError);
        setError(String(dictionary.profile.loadFailed));
      }
      const { count, error: listingCountError } = await supabase
        .schema("marketplace")
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", user.id);
      if (listingCountError) {
        logClientError("profile.listingCount", listingCountError);
      }
      setListingCount(count ?? 0);
      setProfile((data as Profile | null) ?? fallbackProfile);
      setLoading(false);
    }

    void load();
  }, [dictionary.errors.authConfiguration, dictionary.profile.loadFailed, locale]);

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
      .update({
        first_name: firstName || profile.first_name,
        last_name: lastNameParts.join(" ") || profile.last_name,
        full_name: fullName || null,
        display_name: displayName || null,
        language: profile.language,
        country: profile.country,
        city: profile.city,
        timezone: profile.timezone,
        onboarding_completed_at: new Date().toISOString()
      })
      .eq("id", userId);

    if (updateError) {
      logClientError("profile.save", updateError);
      setError(String(dictionary.profile.saveFailed));
    } else {
      setSaved(true);
      setProfile((current) => current ? { ...current, full_name: fullName, display_name: displayName } : current);
    }
    setSaving(false);
  }

  async function logout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace(localizePath("/", locale));
  }

  if (loading) return <LoadingState />;
  if (!userId) {
    return (
      <EmptyState
        title={String(dictionary.profile.loginRequiredTitle)}
        body={String(dictionary.profile.loginRequiredBody)}
        href={`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath("/profile", locale))}`}
        action={String(dictionary.auth.verifyCode)}
      />
    );
  }

  const isDealer = profile?.seller_type === "dealer";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <section className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <h1 className="text-2xl font-black text-oto-text">{String(dictionary.profile.title)}</h1>
        <p className="mt-1 text-sm text-oto-muted">{String(dictionary.profile.detailsHint)}</p>

        <div className="mt-4 grid gap-3 rounded-md bg-oto-surface p-4 text-sm font-bold text-oto-muted md:grid-cols-4">
          <p>{String(dictionary.profile.accountId)}: <span className="text-oto-text">{userId.slice(0, 8)}...{userId.slice(-4)}</span></p>
          <p>{String(dictionary.profile.phone)}: <span className="text-oto-text">{maskPhone(profile?.phone, String(dictionary.profile.noPhone))}</span></p>
          <p>{String(dictionary.profile.listingCount)}: <span className="text-oto-text">{listingCount ?? 0}</span></p>
          <p>{String(dictionary.profile.createdAt)}: <span className="text-oto-text">{createdAt ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR").format(new Date(createdAt)) : String(dictionary.common.noInfo)}</span></p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">{isDealer ? String(dictionary.profile.contactName) : String(dictionary.profile.fullName)}</span>
            <Input value={profile?.full_name ?? ""} onChange={(event) => setProfile((current) => current ? { ...current, full_name: event.target.value } : current)} placeholder={isDealer ? String(dictionary.profile.contactName) : String(dictionary.profile.fullName)} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">{isDealer ? String(dictionary.profile.dealerName) : String(dictionary.profile.displayName)}</span>
            <Input value={profile?.display_name ?? ""} onChange={(event) => setProfile((current) => current ? { ...current, display_name: event.target.value } : current)} placeholder={isDealer ? String(dictionary.profile.dealerName) : String(dictionary.profile.displayName)} />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">{String(dictionary.profile.phone)}</span>
            <Input
              value={profile?.phone ?? ""}
              readOnly
              aria-readonly="true"
              helperText={String(dictionary.profile.phoneVerifiedHint)}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs font-bold text-oto-muted">{String(dictionary.profile.city)}</span>
            <Select value={profile?.city ?? ""} onChange={(event) => setProfile((current) => current ? { ...current, city: event.target.value } : current)}>
              <option value="">{String(dictionary.profile.selectCity)}</option>
              {profileCities.map((city) => <option key={city} value={city}>{cityLabel(city, locale)}</option>)}
            </Select>
          </label>
          <label className="grid gap-1 md:col-span-2">
            <span className="text-xs font-bold text-oto-muted">{String(dictionary.profile.sellerType)}</span>
            <Input
              value={isDealer ? String(dictionary.profile.verifiedDealer) : String(dictionary.profile.privateSeller)}
              readOnly
              aria-readonly="true"
              helperText={String(dictionary.profile.dealerStatusHint)}
            />
          </label>
        </div>
        {error ? <div className="mt-4"><ErrorState message={error} /></div> : null}
        {saved ? <p className="mt-4 rounded-md bg-green-50 p-3 text-sm font-semibold text-oto-success" role="status">{String(dictionary.profile.saveSuccess)}</p> : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <Button onClick={save} disabled={saving}>{saving ? String(dictionary.profile.saving) : String(dictionary.common.save)}</Button>
          <Button onClick={logout} variant="secondary">{String(dictionary.profile.logout)}</Button>
        </div>
      </section>
      <aside className="grid h-fit gap-3 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <ButtonLink href={localizePath("/my-listings", locale)} variant="secondary">{String(dictionary.navigation.myListings)}</ButtonLink>
        <ButtonLink href={localizePath("/favorites", locale)} variant="secondary">{String(dictionary.navigation.favorites)}</ButtonLink>
        <ButtonLink href={localizePath("/settings", locale)} variant="secondary">{String(dictionary.navigation.settings)}</ButtonLink>
        <ButtonLink href={localizePath("/sell", locale)} variant="orange">{String(dictionary.common.publishListing)}</ButtonLink>
      </aside>
    </div>
  );
}

function maskPhone(phone: string | null | undefined, fallback: string) {
  if (!phone) return fallback;
  const compact = phone.replace(/\s+/g, "");
  if (compact.length <= 6) return compact;
  return `${compact.slice(0, 4)} ${"*".repeat(Math.max(3, compact.length - 7))} ${compact.slice(-3)}`;
}

function logClientError(context: string, detail: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[${context}]`, detail);
  }
}
