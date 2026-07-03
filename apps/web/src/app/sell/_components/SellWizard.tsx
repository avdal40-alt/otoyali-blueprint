"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Make, Model } from "@/lib/supabase/types";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { formatPrice } from "@/lib/format";

type WizardState = {
  makeId: string;
  modelId: string;
  year: string;
  mileageKm: string;
  fuelType: string;
  transmission: string;
  city: string;
  priceAmount: string;
  currency: string;
  priceNegotiable: boolean;
  title: string;
  description: string;
  photos: File[];
};

const initialState: WizardState = {
  makeId: "",
  modelId: "",
  year: "",
  mileageKm: "",
  fuelType: "gasoline",
  transmission: "automatic",
  city: "Istanbul",
  priceAmount: "",
  currency: "TRY",
  priceNegotiable: true,
  title: "",
  description: "",
  photos: []
};

export function SellWizard({ makes, models }: { makes: Make[]; models: Model[] }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [step, setStep] = useState(1);
  const [state, setState] = useState(initialState);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function checkAuth() {
      if (!hasSupabaseEnv()) {
        setError("Supabase ortam degiskenleri eksik.");
        setCheckingAuth(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login?next=/sell");
        return;
      }
      setUserId(data.user.id);
      setCheckingAuth(false);
    }

    void checkAuth();
  }, [router]);

  const selectedMake = makes.find((make) => make.make_id === state.makeId);
  const filteredModels = state.makeId ? models.filter((model) => model.make_id === state.makeId) : models;

  const generatedTitle = useMemo(() => {
    const model = models.find((item) => item.model_id === state.modelId);
    if (!state.year || !selectedMake || !model) return "";
    return `${state.year} ${selectedMake.make_name} ${model.model_name}`;
  }, [models, selectedMake, state.modelId, state.year]);

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!userId) {
      router.replace("/login?next=/sell");
      return;
    }

    if (!state.makeId || !state.modelId || !state.year || !state.mileageKm || !state.priceAmount || !state.city) {
      setError("Zorunlu alanlari doldurun.");
      return;
    }

    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();

    const { data: profile, error: profileError } = await supabase
      .schema("vehicle")
      .from("vehicle_profiles")
      .insert({
        make_id: state.makeId,
        model_id: state.modelId,
        year: Number(state.year),
        mileage_km: Number(state.mileageKm),
        fuel_type: state.fuelType,
        transmission: state.transmission,
        created_source: "manual",
        profile_status: "active",
        created_by: userId
      })
      .select("id")
      .single();

    if (profileError || !profile) {
      setSubmitting(false);
      setError(profileError?.message ?? "Arac profili olusturulamadi.");
      return;
    }

    const vehicleProfileId = profile.id as string;

    const { error: ownershipError } = await supabase.schema("vehicle").from("profile_ownership").insert({
      vehicle_profile_id: vehicleProfileId,
      owner_id: userId,
      ownership_type: "owner",
      is_current: true
    });

    if (ownershipError) {
      setSubmitting(false);
      setError(ownershipError.message);
      return;
    }

    const mediaRows = [];
    for (let index = 0; index < state.photos.length; index++) {
      const file = state.photos[index];
      const extension = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${vehicleProfileId}/${Date.now()}-${index}.${extension}`;
      const { error: uploadError } = await supabase.storage.from("vehicle-photos").upload(path, file, {
        cacheControl: "3600",
        upsert: false
      });

      if (uploadError) {
        setSubmitting(false);
        setError(uploadError.message);
        return;
      }

      const { data: publicUrl } = supabase.storage.from("vehicle-photos").getPublicUrl(path);
      mediaRows.push({
        vehicle_profile_id: vehicleProfileId,
        storage_path: path,
        url: publicUrl.publicUrl,
        sort_order: index,
        is_cover: index === 0
      });
    }

    if (mediaRows.length > 0) {
      const { error: mediaError } = await supabase.schema("vehicle").from("profile_media").insert(mediaRows);
      if (mediaError) {
        setSubmitting(false);
        setError(mediaError.message);
        return;
      }
    }

    const listingTitle = state.title.trim() || generatedTitle || "OTOYALI ilani";
    const { data: listing, error: listingError } = await supabase
      .schema("marketplace")
      .from("listings")
      .insert({
        vehicle_profile_id: vehicleProfileId,
        seller_id: userId,
        status: "active",
        title: listingTitle,
        description: state.description.trim() || null,
        price_amount: Number(state.priceAmount),
        currency: state.currency,
        price_negotiable: state.priceNegotiable,
        city: state.city
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (listingError || !listing) {
      setError(listingError?.message ?? "Ilan olusturulamadi.");
      return;
    }

    router.replace(`/listing/${listing.id}`);
  }

  if (checkingAuth) return <LoadingState label="Oturum kontrol ediliyor" />;
  const steps = ["Fotograflar", "Arac bilgileri", "Fiyat", "Aciklama", "On izleme"];

  return (
    <form onSubmit={publish} className="grid gap-5">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {steps.map((label, index) => {
          const item = index + 1;
          return (
            <button
              key={item}
              type="button"
              onClick={() => setStep(item)}
              className={step === item ? "rounded-full bg-oto-blue px-4 py-2 text-sm font-bold text-white" : "rounded-full bg-oto-surface px-4 py-2 text-sm font-bold text-oto-muted"}
            >
              {label}
            </button>
          );
        })}
      </div>

      {step === 1 ? (
        <Panel title="Fotograflar">
          <Input type="file" accept="image/*" multiple onChange={(event) => update("photos", Array.from(event.target.files ?? []))} />
          <p className="text-sm text-oto-muted">{state.photos.length} fotograf secildi.</p>
          {process.env.NODE_ENV !== "production" ? (
            <p className="text-xs font-semibold text-oto-muted">Gelistirme notu: Storage hazir degilse ilan fotograf olmadan yayinlanabilir.</p>
          ) : null}
        </Panel>
      ) : null}

      {step === 2 ? (
        <Panel title="Arac bilgileri">
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={state.makeId} onChange={(event) => update("makeId", event.target.value)}>
              <option value="">Marka</option>
              {makes.map((make) => <option key={make.make_id} value={make.make_id}>{make.make_name}</option>)}
            </Select>
            <Select value={state.modelId} onChange={(event) => update("modelId", event.target.value)}>
              <option value="">Model</option>
              {filteredModels.map((model) => <option key={model.model_id} value={model.model_id}>{model.model_name}</option>)}
            </Select>
            <Input value={state.year} onChange={(event) => update("year", event.target.value)} placeholder="Yil" inputMode="numeric" />
            <Input value={state.mileageKm} onChange={(event) => update("mileageKm", event.target.value)} placeholder="Kilometre" inputMode="numeric" />
            <Select value={state.fuelType} onChange={(event) => update("fuelType", event.target.value)}>
              <option value="gasoline">Benzin</option>
              <option value="diesel">Dizel</option>
              <option value="lpg">LPG</option>
              <option value="electric">Elektrik</option>
              <option value="hybrid">Hibrit</option>
            </Select>
            <Select value={state.transmission} onChange={(event) => update("transmission", event.target.value)}>
              <option value="automatic">Otomatik</option>
              <option value="manual">Manuel</option>
            </Select>
            <Select value={state.city} onChange={(event) => update("city", event.target.value)}>
              {["Istanbul", "Ankara", "Izmir", "Antalya"].map((city) => <option key={city} value={city}>{city}</option>)}
            </Select>
          </div>
        </Panel>
      ) : null}

      {step === 3 ? (
        <Panel title="Fiyat">
          <div className="grid gap-3 md:grid-cols-2">
            <Input value={state.priceAmount} onChange={(event) => update("priceAmount", event.target.value)} placeholder="Fiyat" inputMode="numeric" />
            <Select value={state.currency} onChange={(event) => update("currency", event.target.value)}>
              <option value="TRY">TRY</option>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-oto-muted">
            <input type="checkbox" checked={state.priceNegotiable} onChange={(event) => update("priceNegotiable", event.target.checked)} />
            Pazarlik var
          </label>
        </Panel>
      ) : null}

      {step === 4 ? (
        <Panel title="Aciklama">
          <Input value={state.title} onChange={(event) => update("title", event.target.value)} placeholder={generatedTitle || "Ilan basligi"} />
          <Textarea value={state.description} onChange={(event) => update("description", event.target.value)} placeholder="Aracin durumunu kisaca anlatin" />
        </Panel>
      ) : null}

      {step === 5 ? (
        <Panel title="Onizleme">
          <div className="rounded-oto bg-oto-surface p-4">
            <h2 className="text-xl font-black text-oto-text">{state.title || generatedTitle || "Ilan basligi"}</h2>
            <p className="mt-2 text-2xl font-black text-oto-text">{formatPrice(Number(state.priceAmount || 0), state.currency)}</p>
            <p className="mt-2 text-sm text-oto-muted">{state.city} - {state.year} - {state.mileageKm} km</p>
          </div>
          {error ? <ErrorState message={error} /> : null}
          <Button type="submit" variant="orange" disabled={submitting}>
            {submitting ? "Yayinlaniyor" : "Yayinla"}
          </Button>
        </Panel>
      ) : null}

      <div className="flex justify-between">
        <Button type="button" variant="secondary" onClick={() => setStep((current) => Math.max(1, current - 1))}>Geri</Button>
        {step < 5 ? <Button type="button" onClick={() => setStep((current) => Math.min(5, current + 1))}>Devam</Button> : null}
      </div>
    </form>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <h2 className="text-xl font-black text-oto-text">{title}</h2>
      {children}
    </section>
  );
}
