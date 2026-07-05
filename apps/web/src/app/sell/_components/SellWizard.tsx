"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { HomeListing, Make, Model } from "@/lib/supabase/types";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { cityLabel, formatPrice } from "@/lib/format";
import { getPriceSuggestion } from "@/lib/market-price/analysis";

type WizardState = {
  makeId: string;
  modelId: string;
  year: string;
  mileageKm: string;
  condition: string;
  sellerType: string;
  bodyType: string;
  fuelType: string;
  transmission: string;
  driveType: string;
  color: string;
  engineVolumeL: string;
  damageState: string;
  ownerCount: string;
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
  condition: "used",
  sellerType: "private",
  bodyType: "",
  fuelType: "gasoline",
  transmission: "automatic",
  driveType: "",
  color: "",
  engineVolumeL: "",
  damageState: "",
  ownerCount: "",
  city: "Istanbul",
  priceAmount: "",
  currency: "TRY",
  priceNegotiable: true,
  title: "",
  description: "",
  photos: []
};

const cityOptions = [
  { value: "Istanbul", label: "İstanbul" },
  { value: "Ankara", label: "Ankara" },
  { value: "Izmir", label: "İzmir" },
  { value: "Antalya", label: "Antalya" }
];

export function SellWizard({ makes, models, listings }: { makes: Make[]; models: Model[]; listings: HomeListing[] }) {
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
        setError("Supabase ortam değişkenleri eksik.");
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
  const selectedModel = models.find((item) => item.model_id === state.modelId);
  const filteredModels = state.makeId ? models.filter((model) => model.make_id === state.makeId) : models;

  const generatedTitle = useMemo(() => {
    if (!state.year || !selectedMake || !selectedModel) return "";
    return `${state.year} ${selectedMake.make_name} ${selectedModel.model_name}`;
  }, [selectedMake, selectedModel, state.year]);

  const priceSuggestion = useMemo(() => {
    if (!selectedMake || !selectedModel || !state.year || !state.mileageKm || !state.fuelType || !state.transmission) {
      return null;
    }

    return getPriceSuggestion(
      {
        make_name: selectedMake.make_name,
        model_name: selectedModel.model_name,
        year: Number(state.year)
      },
      listings
    );
  }, [listings, selectedMake, selectedModel, state.fuelType, state.mileageKm, state.transmission, state.year]);

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
      setError("Zorunlu alanları doldurun.");
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
        condition: state.condition,
        fuel_type: state.fuelType,
        transmission: state.transmission,
        body_type: state.bodyType || null,
        drive_type: state.driveType || null,
        color: state.color || null,
        engine_volume_l: state.engineVolumeL ? Number(state.engineVolumeL) : null,
        damage_state: state.damageState || null,
        owner_count: state.ownerCount ? Number(state.ownerCount) : null,
        created_source: "manual",
        profile_status: "active",
        created_by: userId
      })
      .select("id")
      .single();

    if (profileError || !profile) {
      setSubmitting(false);
      setError(profileError?.message ?? "Araç profili oluşturulamadı.");
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

    const listingTitle = state.title.trim() || generatedTitle || "OTOYALI ilanı";
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
        seller_type: state.sellerType,
        city: state.city
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (listingError || !listing) {
      setError(listingError?.message ?? "İlan oluşturulamadı.");
      return;
    }

    router.replace(`/listing/${listing.id}`);
  }

  if (checkingAuth) return <LoadingState label="Oturum kontrol ediliyor" />;
  const steps = ["Fotoğraflar", "Araç bilgileri", "Fiyat", "Açıklama", "Ön izleme"];

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
        <Panel title="Fotoğraflar">
          <div className="rounded-oto border border-oto-border bg-oto-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-oto-text">Plaka/VIN ile doldur</h3>
                <p className="mt-1 text-sm font-semibold text-oto-muted">Araç bilgilerini otomatik doldurma yakında.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-oto-muted">Yakında</span>
            </div>
          </div>
          <Input type="file" accept="image/*" multiple onChange={(event) => update("photos", Array.from(event.target.files ?? []))} />
          <p className="text-sm text-oto-muted">{state.photos.length} fotoğraf seçildi.</p>
          <p className="text-xs font-semibold text-oto-muted">Fotoğraflar ilan kalitesini artırır.</p>
        </Panel>
      ) : null}

      {step === 2 ? (
        <Panel title="Araç bilgileri">
          <div className="grid gap-3 md:grid-cols-2">
            <Select value={state.condition} onChange={(event) => update("condition", event.target.value)}>
              <option value="used">İkinci el</option>
              <option value="new">Sıfır km</option>
            </Select>
            <Select value={state.sellerType} onChange={(event) => update("sellerType", event.target.value)}>
              <option value="private">Bireysel</option>
              <option value="dealer">Galeri</option>
            </Select>
            <Select value={state.makeId} onChange={(event) => update("makeId", event.target.value)}>
              <option value="">Marka</option>
              {makes.map((make) => <option key={make.make_id} value={make.make_id}>{make.make_name}</option>)}
            </Select>
            <Select value={state.modelId} onChange={(event) => update("modelId", event.target.value)}>
              <option value="">Model</option>
              {filteredModels.map((model) => <option key={model.model_id} value={model.model_id}>{model.model_name}</option>)}
            </Select>
            <Input value={state.year} onChange={(event) => update("year", event.target.value)} placeholder="Yıl" inputMode="numeric" />
            <Input value={state.mileageKm} onChange={(event) => update("mileageKm", event.target.value)} placeholder="Kilometre" inputMode="numeric" />
            <Select value={state.bodyType} onChange={(event) => update("bodyType", event.target.value)}>
              <option value="">Kasa tipi</option>
              <option value="sedan">Sedan</option>
              <option value="hatchback">Hatchback</option>
              <option value="suv">SUV</option>
              <option value="wagon">Station wagon</option>
              <option value="coupe">Coupe</option>
            </Select>
            <Select value={state.fuelType} onChange={(event) => update("fuelType", event.target.value)}>
              <option value="gasoline">Benzin</option>
              <option value="diesel">Dizel</option>
              <option value="lpg">LPG</option>
              <option value="electric">Elektrikli</option>
              <option value="hybrid">Hibrit</option>
            </Select>
            <Select value={state.transmission} onChange={(event) => update("transmission", event.target.value)}>
              <option value="automatic">Otomatik</option>
              <option value="manual">Manuel</option>
            </Select>
            <Select value={state.driveType} onChange={(event) => update("driveType", event.target.value)}>
              <option value="">Çekiş</option>
              <option value="front">Önden çekiş</option>
              <option value="rear">Arkadan itiş</option>
              <option value="awd">4x4 / AWD</option>
            </Select>
            <Select value={state.color} onChange={(event) => update("color", event.target.value)}>
              <option value="">Renk</option>
              <option value="white">Beyaz</option>
              <option value="black">Siyah</option>
              <option value="gray">Gri</option>
              <option value="blue">Mavi</option>
              <option value="red">Kırmızı</option>
            </Select>
            <Input value={state.engineVolumeL} onChange={(event) => update("engineVolumeL", event.target.value)} placeholder="Motor hacmi, örn. 1.6" inputMode="decimal" />
            <Select value={state.damageState} onChange={(event) => update("damageState", event.target.value)}>
              <option value="">Hasar durumu</option>
              <option value="unknown">Bilinmiyor</option>
              <option value="none">Hasarsız</option>
              <option value="minor">Hafif hasarlı</option>
              <option value="major">Ağır hasarlı</option>
            </Select>
            <Input value={state.ownerCount} onChange={(event) => update("ownerCount", event.target.value)} placeholder="Sahip sayısı" inputMode="numeric" />
            <Select value={state.city} onChange={(event) => update("city", event.target.value)}>
              {cityOptions.map((city) => <option key={city.value} value={city.value}>{city.label}</option>)}
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
            Pazarlık var
          </label>
          {selectedMake && selectedModel && state.year && state.mileageKm ? (
            <PriceSuggestionCard suggestion={priceSuggestion} currency={state.currency} />
          ) : null}
        </Panel>
      ) : null}

      {step === 4 ? (
        <Panel title="Açıklama">
          <Input value={state.title} onChange={(event) => update("title", event.target.value)} placeholder={generatedTitle || "İlan başlığı"} />
          <Textarea value={state.description} onChange={(event) => update("description", event.target.value)} placeholder="Aracın durumunu kısaca anlatın" />
        </Panel>
      ) : null}

      {step === 5 ? (
        <Panel title="Ön izleme">
          <div className="rounded-oto bg-oto-surface p-4">
            <h2 className="text-xl font-black text-oto-text">{state.title || generatedTitle || "İlan başlığı"}</h2>
            <p className="mt-2 text-2xl font-black text-oto-text">{formatPrice(Number(state.priceAmount || 0), state.currency)}</p>
            <p className="mt-2 text-sm text-oto-muted">{cityLabel(state.city)} - {state.year} - {state.mileageKm} km</p>
          </div>
          {error ? <ErrorState message={error} /> : null}
          <Button type="submit" variant="orange" disabled={submitting}>
            {submitting ? "Yayınlanıyor" : "Yayınla"}
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

function PriceSuggestionCard({
  suggestion,
  currency
}: {
  suggestion: ReturnType<typeof getPriceSuggestion>;
  currency: string;
}) {
  return (
    <div className="rounded-oto border border-oto-border bg-oto-surface p-4">
      <h3 className="text-base font-black text-oto-text">Tahmini piyasa fiyatı</h3>
      {suggestion ? (
        <div className="mt-3 grid gap-2 text-sm font-semibold text-oto-muted">
          <p>
            Benzer ilan aralığı: {formatPrice(suggestion.minPrice, currency)} - {formatPrice(suggestion.maxPrice, currency)}
          </p>
          <p>Daha hızlı satış için önerilen fiyat: {formatPrice(suggestion.averagePrice, currency)}</p>
          <p className="text-xs">{suggestion.comparableCount} benzer ilan üzerinden hesaplandı. Garanti edilen satış fiyatı değildir.</p>
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-oto-muted">
          Yeterli benzer ilan yok. Fiyat önerisi yakında daha güçlü olacak.
        </p>
      )}
    </div>
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
