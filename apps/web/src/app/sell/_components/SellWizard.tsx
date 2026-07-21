"use client";

import { FormEvent, type ReactNode, useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { City, HomeListing, Make, Model, Profile } from "@/lib/supabase/types";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { SafeImage } from "@/components/ui/SafeImage";
import { bodyTypeLabel, cityLabel, damageStateLabel, driveTypeLabel, formatMileage, formatPrice, fuelLabel, sellerTypeLabel, transmissionLabel } from "@/lib/format";
import { getPriceSuggestion } from "@/lib/market-price/analysis";
import { prepareImageVariants, type PreparedImageSet, type PreparedImageVariantName } from "@/lib/media/client-image-processing";
import { localizePath } from "@/i18n/config";
import { useI18n } from "@/i18n/client";

type PhotoItem = {
  id: string;
  file: File;
  previewUrl: string;
  isCover: boolean;
  processingStatus: "processing" | "ready" | "failed";
  uploadStatus: "idle" | "uploading" | "ready" | "failed";
  statusText: string;
  error?: string | null;
  prepared?: PreparedImageSet | null;
};

type WizardState = {
  makeId: string;
  modelId: string;
  year: string;
  city: string;
  condition: string;
  sellerType: string;
  mileageKm: string;
  fuelType: string;
  transmission: string;
  bodyType: string;
  driveType: string;
  color: string;
  engineVolumeL: string;
  damageState: string;
  ownerCount: string;
  priceAmount: string;
  currency: string;
  priceNegotiable: boolean;
  description: string;
  photos: PhotoItem[];
};

type SellerProfileState = {
  fullName: string;
  displayName: string;
  phone: string;
  city: string;
  sellerType: string;
  language: string;
  country: string;
  timezone: string;
};

type PersistedWizardState = Omit<WizardState, "photos">;

type QualityItem = {
  label: string;
  complete: boolean;
};

const maxPhotos = 20;
const maxFileSize = 10 * 1024 * 1024;
const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
const fallbackCityOptions = ["İstanbul", "Ankara", "İzmir", "Antalya"];

const initialState: WizardState = {
  makeId: "",
  modelId: "",
  year: "",
  city: "İstanbul",
  condition: "used",
  sellerType: "private",
  mileageKm: "",
  fuelType: "gasoline",
  transmission: "automatic",
  bodyType: "",
  driveType: "",
  color: "",
  engineVolumeL: "",
  damageState: "unknown",
  ownerCount: "",
  priceAmount: "",
  currency: "TRY",
  priceNegotiable: true,
  description: "",
  photos: []
};

const steps = ["Satıcı bilgileri", "Araç bilgileri", "Donanım ve açıklama", "Fotoğraflar", "Fiyat ve konum", "Önizleme"];

const fuelOptions = ["gasoline", "diesel", "hybrid", "electric", "lpg", "other"];
const transmissionOptions = ["automatic", "manual", "semi_automatic"];
const bodyTypeOptions = ["sedan", "hatchback", "suv", "coupe", "wagon", "pickup", "minivan", "commercial", "other"];
const driveTypeOptions = ["front", "rear", "4x4", "awd"];
const damageOptions = ["unknown", "none", "painted", "replaced", "heavy_damage"];
const colorOptions = [
  { value: "", label: "Renk" },
  { value: "white", label: "Beyaz" },
  { value: "black", label: "Siyah" },
  { value: "gray", label: "Gri" },
  { value: "blue", label: "Mavi" },
  { value: "red", label: "Kırmızı" },
  { value: "silver", label: "Gümüş" }
];

const photoChecklist = [
  "Ön 3/4 görünüm",
  "Arka 3/4 görünüm",
  "İç mekan",
  "Gösterge paneli",
  "Kilometre ekranı",
  "Motor bölümü",
  "Lastikler",
  "Hasar / çizik varsa yakın çekim"
];

export function SellWizard({
  makes,
  models,
  cities,
  listings
}: {
  makes: Make[];
  models: Model[];
  cities?: City[];
  listings: HomeListing[];
}) {
  const { locale, dictionary } = useI18n();
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [step, setStep] = useState(1);
  const [state, setState] = useState(initialState);
  const [profile, setProfile] = useState<SellerProfileState | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [publishStatus, setPublishStatus] = useState<string | null>(null);
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null);
  const [modelsForMake, setModelsForMake] = useState<Model[]>(models);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      if (!hasSupabaseEnv()) {
        setError(String(dictionary.errors.missingSupabaseEnv));
        setCheckingAuth(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace(`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath("/sell", locale))}`);
        return;
      }

      setUserId(data.user.id);
      const { data: profileRow } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      const sellerProfile = toSellerProfile((profileRow as Profile | null) ?? null, data.user.phone ?? "", locale);
      setProfile(sellerProfile);
      const savedDraft = readStoredDraft(data.user.id);
      setState((current) => ({
        ...current,
        ...(savedDraft ?? {}),
        photos: [],
        city: savedDraft?.city || sellerProfile.city || current.city,
        sellerType: sellerProfile.sellerType || savedDraft?.sellerType || current.sellerType
      }));
      if (savedDraft?.makeId) {
        void loadModelsForMake(savedDraft.makeId);
      }
      setCheckingAuth(false);
    }

    void checkAuth();
  }, [dictionary.errors.missingSupabaseEnv, locale, router]);

  useEffect(() => {
    if (!userId || publishedListingId) return;
    saveStoredDraft(userId, state);
  }, [publishedListingId, state, userId]);

  useEffect(() => {
    if (!userId || publishedListingId || submitting || !hasUnsavedDraft(state)) return;

    function warnBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [publishedListingId, state, submitting, userId]);

  const selectedMake = makes.find((make) => make.make_id === state.makeId);
  const selectedModel = modelsForMake.find((item) => item.model_id === state.modelId);
  const filteredModels = state.makeId ? modelsForMake : [];
  const cityOptions = useMemo(() => {
    const catalogCities = (cities ?? [])
      .map((city) => city.city_name?.trim())
      .filter(Boolean) as string[];

    return catalogCities.length > 0 ? catalogCities : fallbackCityOptions;
  }, [cities]);
  const generatedTitle = generateListingTitle(selectedMake, selectedModel, state.year);
  const qualityScore = calculateQualityScore(state);
  const profileValidation = profile ? validateSellerProfile(profile) : "Satıcı bilgilerinizi tamamlayın.";
  const profileComplete = !profileValidation;
  const qualityItems = getQualityItems(state, profileComplete);
  const usesFallbackCatalogOption = selectedMake?.make_name === "Diğer" || selectedModel?.model_name === "Diğer";
  const priceSuggestion = useMemo(() => {
    if (!selectedMake || !selectedModel || !state.year || !state.mileageKm) {
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
  }, [listings, selectedMake, selectedModel, state.mileageKm, state.year]);

  function update<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((current) => ({ ...current, [key]: value }));
  }

  function updateMake(makeId: string) {
    setState((current) => ({ ...current, makeId, modelId: "" }));
    setModelsForMake([]);
    setModelsError(null);
    if (makeId) {
      void loadModelsForMake(makeId);
    }
  }

  function updateProfile<K extends keyof SellerProfileState>(key: K, value: SellerProfileState[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
    if (key === "city" || key === "sellerType") {
      setState((current) => ({ ...current, [key === "city" ? "city" : "sellerType"]: value }));
    }
  }

  async function loadModelsForMake(makeId: string) {
    if (!hasSupabaseEnv()) return;

    setModelsLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error: loadError } = await supabase
      .from("ff_models")
      .select("model_id,make_id,make_name,model_name,model_slug")
      .eq("make_id", makeId)
      .order("model_name", { ascending: true });

    if (loadError) {
      logClientError("sell.loadModels", loadError);
      setModelsError("Modeller yüklenemedi. Lütfen tekrar deneyin.");
      setModelsForMake([]);
    } else {
      setModelsForMake((data ?? []) as Model[]);
    }

    setModelsLoading(false);
  }

  async function persistProfile() {
    if (!profile || !userId) return false;
    const validation = validateSellerProfile(profile);
    if (validation) {
      setError(validation);
      return false;
    }

    setProfileSaving(true);
    setError(null);
    const supabase = getSupabaseBrowserClient();
    const [firstName, ...lastNameParts] = profile.fullName.split(" ").filter(Boolean);
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: userId,
        phone: profile.phone,
        first_name: firstName || null,
        last_name: lastNameParts.join(" ") || null,
        full_name: profile.fullName.trim(),
        display_name: profile.displayName.trim(),
        city: profile.city,
        seller_type: profile.sellerType,
        language: profile.language,
        country: profile.country,
        timezone: profile.timezone,
        onboarding_completed_at: new Date().toISOString()
      },
      { onConflict: "id" }
    );

    if (profileError) {
      logClientError("sell.saveProfile", profileError);
      setError("Satıcı bilgileriniz kaydedilemedi. Lütfen tekrar deneyin.");
      setProfileSaving(false);
      return false;
    } else {
      setState((current) => ({ ...current, city: current.city || profile.city, sellerType: profile.sellerType }));
    }
    setProfileSaving(false);
    return true;
  }

  async function saveProfile() {
    await persistProfile();
  }

  function handlePhotoSelect(files: FileList | null) {
    setError(null);
    if (!files) return;

    const nextFiles = Array.from(files);
    const availableSlots = maxPhotos - state.photos.length;
    if (nextFiles.length > availableSlots) {
      setError("En fazla 20 fotoğraf yükleyebilirsiniz.");
      return;
    }

    const invalid = nextFiles.find((file) => !allowedMimeTypes.includes(file.type) || file.size > maxFileSize);
    if (invalid) {
      setError("Fotoğraf yüklenemedi. Lütfen JPEG, PNG veya WebP formatında ve 10 MB altında dosya seçin.");
      return;
    }

    const shouldSetCover = state.photos.length === 0;
    const photoItems = nextFiles.map((file, index) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      isCover: shouldSetCover && index === 0,
      processingStatus: "processing" as const,
      uploadStatus: "idle" as const,
      statusText: "Görseller optimize ediliyor",
      error: null,
      prepared: null
    }));
    setState((current) => ({ ...current, photos: [...current.photos, ...photoItems] }));
    photoItems.forEach((photo) => {
      void processPhoto(photo.id, photo.file);
    });
  }

  async function processPhoto(photoId: string, file: File) {
    updatePhoto(photoId, {
      processingStatus: "processing",
      statusText: "Görseller optimize ediliyor",
      error: null
    });

    try {
      const prepared = await prepareImageVariants(file);
      updatePhoto(photoId, {
        processingStatus: "ready",
        statusText: "Fotoğraf hazır",
        prepared
      });
    } catch (processingError) {
      logClientError("sell.processPhoto", processingError);
      updatePhoto(photoId, {
        processingStatus: "failed",
        statusText: "Fotoğraf işlenemedi",
        error: "Görsel işlenemedi. Orijinal dosya güvenli yedek olarak kullanılacak.",
        prepared: null
      });
    }
  }

  function retryPhotoProcessing(photo: PhotoItem) {
    void processPhoto(photo.id, photo.file);
  }

  function updatePhoto(photoId: string, patch: Partial<PhotoItem>) {
    setState((current) => ({
      ...current,
      photos: current.photos.map((photo) => (photo.id === photoId ? { ...photo, ...patch } : photo))
    }));
  }

  function removePhoto(photoId: string) {
    setState((current) => {
      const removed = current.photos.find((photo) => photo.id === photoId);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      const remaining = current.photos.filter((photo) => photo.id !== photoId);
      if (remaining.length > 0 && !remaining.some((photo) => photo.isCover)) {
        remaining[0] = { ...remaining[0], isCover: true };
      }
      return { ...current, photos: remaining };
    });
  }

  function setCover(photoId: string) {
    setState((current) => ({
      ...current,
      photos: current.photos.map((photo) => ({ ...photo, isCover: photo.id === photoId }))
    }));
  }

  function goNext() {
    if (step === 1) {
      if (!profileComplete) {
        setError(profileValidation);
        return;
      }
      setError(null);
      setStep((current) => Math.min(steps.length, current + 1));
      return;
    }

    const validation = validateStep(step, state);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setStep((current) => Math.min(steps.length, current + 1));
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!userId) {
      router.replace(`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath("/sell", locale))}`);
      return;
    }

    if (!profileComplete || !profile) {
      setError("İlan yayınlamadan önce satıcı profilinizi tamamlayın.");
      return;
    }

    if (!rulesAccepted) {
      setError("Devam etmek için ilan yayınlama kurallarını kabul edin.");
      return;
    }

    const validation = validateForPublish(state);
    if (validation) {
      setError(validation);
      return;
    }

    setSubmitting(true);
    setPublishStatus("Satıcı bilgileriniz kontrol ediliyor.");
    const profileSaved = await persistProfile();
    if (!profileSaved) {
      setSubmitting(false);
      setPublishStatus(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setPublishStatus("Araç profili oluşturuluyor.");

    const { data: vehicleProfile, error: profileError } = await supabase
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

    if (profileError || !vehicleProfile) {
      logClientError("sell.createVehicleProfile", profileError);
      setSubmitting(false);
      setPublishStatus(null);
      setError("Araç bilgileri kaydedilemedi. Lütfen tekrar deneyin.");
      return;
    }

    const vehicleProfileId = vehicleProfile.id as string;
    setPublishStatus("Araç sahipliği doğrulanıyor.");
    const { error: ownershipError } = await supabase.schema("vehicle").from("profile_ownership").insert({
      vehicle_profile_id: vehicleProfileId,
      owner_id: userId,
      ownership_type: "owner",
      is_current: true
    });

    if (ownershipError) {
      logClientError("sell.createOwnership", ownershipError);
      setSubmitting(false);
      setPublishStatus(null);
      setError("Araç sahipliği kaydedilemedi. Lütfen tekrar deneyin.");
      return;
    }

    setPublishStatus("İlan taslağı oluşturuluyor.");
    const { data: listing, error: listingError } = await supabase
      .schema("marketplace")
      .from("listings")
      .insert({
        vehicle_profile_id: vehicleProfileId,
        seller_id: userId,
        status: "draft",
        title: generatedTitle,
        title_generated: true,
        description: state.description.trim() || null,
        price_amount: Number(state.priceAmount),
        currency: state.currency,
        price_negotiable: state.priceNegotiable,
        seller_type: profile.sellerType,
        seller_display_name: profile.displayName,
        city: state.city,
        quality_score: qualityScore,
        moderation_status: "pending_review"
      })
      .select("id")
      .single();

    if (listingError || !listing) {
      logClientError("sell.createListing", listingError);
      setSubmitting(false);
      setPublishStatus(null);
      setError("İlan taslağı oluşturulamadı. Lütfen tekrar deneyin.");
      return;
    }

    const listingId = listing.id as string;
    let coverMediaId: string | null = null;

    if (state.photos.length > 0) {
      const mediaRows = [];
      for (let index = 0; index < state.photos.length; index++) {
        const photo = state.photos[index];
        setPublishStatus(`Fotoğraflar yükleniyor (${index + 1}/${state.photos.length}).`);
        updatePhoto(photo.id, { uploadStatus: "uploading", statusText: "Fotoğraflar yükleniyor" });

        try {
          const mediaUpload = await uploadPhotoMedia({
            supabase,
            userId,
            vehicleProfileId,
            photo,
            sortOrder: index,
            onStatus: (statusText) => updatePhoto(photo.id, { uploadStatus: "uploading", statusText })
          });
          mediaRows.push(mediaUpload);
          updatePhoto(photo.id, { uploadStatus: "ready", statusText: "Fotoğraf hazır" });
        } catch (uploadError) {
          logClientError("sell.uploadPhoto", uploadError);
          updatePhoto(photo.id, { uploadStatus: "failed", statusText: "Fotoğraf yüklenemedi", error: "Fotoğraf yüklenemedi. Lütfen tekrar deneyin." });
          setSubmitting(false);
          setPublishStatus(null);
          setError("Fotoğraf yüklenemedi. Lütfen tekrar deneyin.");
          return;
        }
      }

      const { data: insertedMedia, error: mediaError } = await supabase
        .schema("vehicle")
        .from("profile_media")
        .insert(mediaRows)
        .select("id,is_cover");

      if (mediaError) {
        logClientError("sell.createMedia", mediaError);
        setSubmitting(false);
        setPublishStatus(null);
        setError("Fotoğraflar kaydedilemedi. Lütfen tekrar deneyin.");
        return;
      }

      coverMediaId = ((insertedMedia ?? []) as Array<{ id: string; is_cover: boolean }>).find((item) => item.is_cover)?.id ?? null;
    }

    setPublishStatus("İlanınız moderasyon kontrolüne gönderiliyor.");
    const { error: activateError } = await supabase
      .schema("marketplace")
      .from("listings")
      .update({
        status: "draft",
        moderation_status: "pending_review",
        quality_score: qualityScore,
        cover_media_id: coverMediaId
      })
      .eq("id", listingId);

    setSubmitting(false);
    setPublishStatus(null);

    if (activateError) {
      logClientError("sell.submitForReview", activateError);
      setPublishedListingId(listingId);
      clearStoredDraft(userId);
      return;
    }

    clearStoredDraft(userId);
    state.photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setPublishedListingId(listingId);
  }

  if (checkingAuth) return <LoadingState label="Oturum kontrol ediliyor" />;

  if (publishedListingId) {
    return (
      <SuccessState
        onCreateNew={() => {
          setState({
            ...initialState,
            city: profile?.city || initialState.city,
            sellerType: profile?.sellerType || initialState.sellerType
          });
          setRulesAccepted(false);
          setPublishedListingId(null);
          setStep(1);
        }}
      />
    );
  }

  if (profile && !profileComplete) {
    return (
      <div className="grid gap-5">
        <Panel title="Satıcı profilinizi tamamlayın">
          <p className="text-sm leading-6 text-oto-muted">İlan yayınlamak için yalnızca gerekli satıcı bilgilerini tamamlayın. Telefonunuz misafir kullanıcılara açık gösterilmez.</p>
          <ProfileFields profile={profile} cities={cityOptions} onChange={updateProfile} locale={locale} />
          {error ? <ErrorState message={error} /> : null}
          <Button type="button" onClick={saveProfile} disabled={profileSaving}>
            {profileSaving ? "Kaydediliyor" : "Devam et"}
          </Button>
        </Panel>
      </div>
    );
  }

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
              disabled={item > step}
              className={step === item ? "shrink-0 rounded-full bg-oto-blue px-4 py-2 text-sm font-bold text-white" : item < step ? "shrink-0 rounded-full bg-oto-surface px-4 py-2 text-sm font-bold text-oto-text" : "shrink-0 rounded-full bg-oto-surface px-4 py-2 text-sm font-bold text-oto-muted opacity-60"}
            >
              {item}. {label}
            </button>
          );
        })}
      </div>

      {step === 1 && profile ? (
        <Panel title="Satıcı bilgileri">
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-oto-muted">
              Bu bilgiler ilan yönetimi ve güvenli iletişim için kullanılır. Telefon numaranız ilan kartlarında açık gösterilmez.
            </p>
            <ProfileFields profile={profile} cities={cityOptions} onChange={updateProfile} locale={locale} />
            {profile.sellerType === "dealer" ? (
              <p className="rounded-md bg-oto-surface px-3 py-2 text-xs font-bold leading-5 text-oto-muted">
                Galeri doğrulaması ileride eklenecek. MVP kapsamında yalnızca galeri adı ve yetkili kişi bilgisi alınır.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={saveProfile} disabled={profileSaving}>
                {profileSaving ? "Kaydediliyor" : "Bilgileri kaydet"}
              </Button>
              <span className="self-center text-xs font-bold text-oto-muted">Son adımda bilgiler yeniden kontrol edilir.</span>
            </div>
          </div>
        </Panel>
      ) : null}

      {step === 2 ? (
        <Panel title="Araç bilgileri">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Marka">
              <Select value={state.makeId} onChange={(event) => updateMake(event.target.value)}>
                <option value="">Marka seçin</option>
                {makes.map((make) => <option key={make.make_id} value={make.make_id}>{make.make_name}</option>)}
              </Select>
            </Field>
            <Field label="Model">
              <Select value={state.modelId} onChange={(event) => update("modelId", event.target.value)} disabled={!state.makeId}>
                <option value="">{modelsLoading ? "Modeller yükleniyor" : "Model seçin"}</option>
                {filteredModels.map((model) => <option key={model.model_id} value={model.model_id}>{model.model_name}</option>)}
              </Select>
              {modelsError ? <span className="text-xs font-bold text-oto-danger">{modelsError}</span> : null}
            </Field>
            <Field label="Yıl">
              <Input value={state.year} onChange={(event) => update("year", event.target.value)} placeholder="2021" inputMode="numeric" />
            </Field>
            <Field label="Durum">
              <Select value={state.condition} onChange={(event) => update("condition", event.target.value)}>
                <option value="used">İkinci el</option>
                <option value="new">Sıfır km</option>
              </Select>
            </Field>
          </div>
          {usesFallbackCatalogOption ? (
            <p className="rounded-md bg-oto-surface px-3 py-2 text-sm font-semibold text-oto-muted">
              Eksik marka veya modeli destek ekibine bildirebilirsiniz.
            </p>
          ) : null}
        </Panel>
      ) : null}

      {step === 3 ? (
        <Panel title="Donanım ve açıklama">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Kilometre">
              <Input value={state.mileageKm} onChange={(event) => update("mileageKm", event.target.value)} placeholder="45000" inputMode="numeric" />
            </Field>
            <Field label="Yakıt tipi">
              <Select value={state.fuelType} onChange={(event) => update("fuelType", event.target.value)}>
                {fuelOptions.map((option) => <option key={option} value={option}>{fuelLabel(option, locale)}</option>)}
              </Select>
            </Field>
            <Field label="Vites">
              <Select value={state.transmission} onChange={(event) => update("transmission", event.target.value)}>
                {transmissionOptions.map((option) => <option key={option} value={option}>{transmissionLabel(option, locale)}</option>)}
              </Select>
            </Field>
            <Field label="Kasa tipi">
              <Select value={state.bodyType} onChange={(event) => update("bodyType", event.target.value)}>
                <option value="">Kasa tipi seçin</option>
                {bodyTypeOptions.map((option) => <option key={option} value={option}>{bodyTypeLabel(option)}</option>)}
              </Select>
            </Field>
            <Field label="Çekiş">
              <Select value={state.driveType} onChange={(event) => update("driveType", event.target.value)}>
                <option value="">Çekiş seçin</option>
                {driveTypeOptions.map((option) => <option key={option} value={option}>{driveTypeLabel(option)}</option>)}
              </Select>
            </Field>
            <Field label="Renk">
              <Select value={state.color} onChange={(event) => update("color", event.target.value)}>
                {colorOptions.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
              </Select>
            </Field>
            <Field label="Motor hacmi">
              <Input value={state.engineVolumeL} onChange={(event) => update("engineVolumeL", event.target.value)} placeholder="1.6" inputMode="decimal" />
            </Field>
            <Field label="Hasar durumu">
              <Select value={state.damageState} onChange={(event) => update("damageState", event.target.value)}>
                {damageOptions.map((option) => <option key={option} value={option}>{damageStateLabel(option)}</option>)}
              </Select>
            </Field>
            <Field label="Sahip sayısı">
              <Input value={state.ownerCount} onChange={(event) => update("ownerCount", event.target.value)} placeholder="1" inputMode="numeric" />
            </Field>
          </div>
          <p className="text-xs font-semibold leading-5 text-oto-muted">Hasar bilgileri satıcı beyanıdır; OTOYALI doğrulama iddiasında bulunmaz.</p>
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-oto-muted">Açıklama</label>
              <span className="rounded-full bg-oto-surface px-3 py-1 text-xs font-black text-oto-muted">AI ile açıklama hazırla · Yakında</span>
            </div>
            <Textarea
              value={state.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="Örnek: Aracım düzenli bakımlı, iç-dış kondisyonu iyi. Bilinen hasar ve değişen parçalar açıklamada belirtilmiştir. Ek donanımlar ve satış nedeni hakkında kısa bilgi paylaşabilirsiniz."
            />
            <div className="grid gap-1 text-xs font-semibold text-oto-muted sm:grid-cols-2">
              <span>Aracın genel durumu</span>
              <span>Bakım geçmişi</span>
              <span>Bilinen hasar / değişen parçalar</span>
              <span>Donanım ve aksesuarlar</span>
              <span>Satış nedeni</span>
              <span>Takas düşünceniz</span>
            </div>
          </div>
        </Panel>
      ) : null}

      {step === 4 ? (
        <Panel title="Fotoğraflar">
          <div className="rounded-oto border border-oto-border bg-oto-surface p-4">
            <h3 className="text-sm font-black text-oto-text">Fotoğraf rehberi</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {photoChecklist.map((item) => (
                <div key={item} className="rounded-md bg-white px-3 py-2 text-xs font-bold text-oto-muted">{item}</div>
              ))}
            </div>
          </div>
          <label className="grid cursor-pointer gap-2 rounded-oto border border-dashed border-oto-border bg-white p-5 text-center">
            <span className="text-base font-black text-oto-text">Fotoğraf ekle</span>
            <span className="text-sm font-semibold leading-6 text-oto-muted">
              JPEG, PNG veya WebP kullanın. Görseller large, card ve thumb boyutlarına optimize edilir. Her fotoğraf en fazla 10 MB olabilir.
            </span>
            <Input className="mx-auto max-w-md" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => handlePhotoSelect(event.target.files)} />
          </label>
          <p className="text-sm text-oto-muted">{state.photos.length}/{maxPhotos} fotoğraf seçildi. Plaka ve kişisel bilgilerin görünür olmadığından emin olun.</p>
          {state.photos.length > 0 && state.photos.length < 3 ? (
            <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-700">En az 3 fotoğraf eklemeniz önerilir.</p>
          ) : null}
          {state.photos.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {state.photos.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-oto border border-oto-border bg-white">
                  <div className="aspect-[4/3]">
                    <SafeImage src={photo.previewUrl} alt="İlan fotoğrafı" />
                  </div>
                  <div className="grid gap-2 p-3">
                    <span className="text-xs font-bold text-oto-muted">{photo.isCover ? "Kapak fotoğrafı" : photo.file.name}</span>
                    <span className={photo.processingStatus === "failed" || photo.uploadStatus === "failed" ? "rounded-full bg-red-50 px-3 py-1 text-xs font-black text-oto-danger" : "rounded-full bg-oto-surface px-3 py-1 text-xs font-black text-oto-muted"}>
                      {photo.statusText}
                    </span>
                    {photo.prepared ? (
                      <span className="text-xs font-semibold text-oto-muted">
                        Large {Math.round(photo.prepared.variants.large.sizeBytes / 1024)} KB · Card {Math.round(photo.prepared.variants.card.sizeBytes / 1024)} KB · Thumb {Math.round(photo.prepared.variants.thumb.sizeBytes / 1024)} KB
                      </span>
                    ) : null}
                    {photo.error ? <span className="text-xs font-semibold leading-5 text-oto-danger">{photo.error}</span> : null}
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="secondary" onClick={() => setCover(photo.id)} disabled={photo.isCover}>Kapak yap</Button>
                      <Button type="button" variant="ghost" onClick={() => removePhoto(photo.id)}>Kaldır</Button>
                      {photo.processingStatus === "failed" ? (
                        <Button type="button" variant="secondary" onClick={() => retryPhotoProcessing(photo)}>Tekrar dene</Button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </Panel>
      ) : null}

      {step === 5 ? (
        <Panel title="Fiyat ve konum">
          <div className="rounded-oto border border-oto-border bg-oto-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-oto-text">Plaka/VIN ile doldur</h3>
                <p className="mt-1 text-sm font-semibold text-oto-muted">Araç bilgilerini otomatik doldurma yakında.</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-oto-muted">Yakında</span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Fiyat">
              <Input value={state.priceAmount} onChange={(event) => update("priceAmount", event.target.value)} placeholder="1250000" inputMode="numeric" />
            </Field>
            <Field label="Para birimi">
              <Select value={state.currency} onChange={(event) => update("currency", event.target.value)}>
                <option value="TRY">TRY</option>
              </Select>
            </Field>
            <Field label="Şehir">
              <Select value={state.city} onChange={(event) => update("city", event.target.value)}>
                <option value="">Şehir seçin</option>
                {cityOptions.map((city) => <option key={city} value={city}>{cityLabel(city, locale)}</option>)}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-oto-muted">
            <input type="checkbox" checked={state.priceNegotiable} onChange={(event) => update("priceNegotiable", event.target.checked)} />
            Pazarlık var
          </label>
          <PriceSuggestionCard suggestion={priceSuggestion} currency={state.currency} locale={locale} />
        </Panel>
      ) : null}

      {step === 6 ? (
        <Panel title="Önizleme ve yayınla">
          <div className="overflow-hidden rounded-oto border border-oto-border bg-white">
            <div className="aspect-[4/3] bg-oto-surface">
              <SafeImage src={state.photos.find((photo) => photo.isCover)?.previewUrl} alt={generatedTitle || "İlan önizleme"} />
            </div>
            <div className="grid gap-3 p-4">
              <h2 className="text-xl font-black text-oto-text">{generatedTitle || "İlan başlığı"}</h2>
              <p className="text-2xl font-black text-oto-text">{formatPrice(Number(state.priceAmount || 0), state.currency, locale)}</p>
              <p className="text-sm font-semibold text-oto-muted">
                {cityLabel(state.city, locale)} · {formatMileage(Number(state.mileageKm || 0), locale)} · {fuelLabel(state.fuelType, locale)} · {transmissionLabel(state.transmission, locale)} · {sellerTypeLabel(profile?.sellerType ?? state.sellerType, locale)}
              </p>
              <QualityScore score={qualityScore} items={qualityItems} />
              <p className="text-sm leading-6 text-oto-muted">{state.description || "Satıcı açıklama eklememiş."}</p>
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-oto border border-oto-border bg-oto-surface p-4 text-sm font-semibold leading-6 text-oto-muted">
            <input className="mt-1" type="checkbox" checked={rulesAccepted} onChange={(event) => setRulesAccepted(event.target.checked)} />
            <span>
              İlanı yayınlayarak{" "}
              <Link href="/terms" className="font-black text-oto-blue">Kullanım Şartları</Link>
              {" "}ve{" "}
              <Link href="/listing-rules" className="font-black text-oto-blue">İlan Yayınlama Kuralları</Link>
              {" "}metinlerini kabul etmiş olursunuz.
            </span>
          </label>
          {error ? <ErrorState message={error} /> : null}
          {publishStatus ? <p className="rounded-md bg-oto-surface p-3 text-sm font-bold text-oto-muted">{publishStatus}</p> : null}
          <Button type="submit" variant="orange" disabled={submitting}>
            {submitting ? "Yayınlanıyor" : "İlanı yayınla"}
          </Button>
        </Panel>
      ) : null}

      {error && step !== 6 ? <ErrorState message={error} /> : null}

      <div className="flex justify-between gap-3">
        <Button type="button" variant="secondary" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1 || submitting}>Geri</Button>
        {step < steps.length ? (
          <Button type="button" onClick={goNext}>Devam</Button>
        ) : null}
      </div>
    </form>
  );
}

function ProfileFields({
  profile,
  cities,
  onChange,
  locale
}: {
  profile: SellerProfileState;
  cities: string[];
  onChange: <K extends keyof SellerProfileState>(key: K, value: SellerProfileState[K]) => void;
  locale: "tr" | "en";
}) {
  const isDealer = profile.sellerType === "dealer";

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label="Satıcı türü">
        <Select value={profile.sellerType} onChange={(event) => onChange("sellerType", event.target.value)}>
          <option value="private">Bireysel</option>
          <option value="dealer">Galeri</option>
        </Select>
      </Field>
      <Field label="Telefon">
        <Input value={profile.phone} onChange={(event) => onChange("phone", event.target.value)} placeholder="+..." />
      </Field>
      <Field label={isDealer ? "Yetkili kişi adı" : "Adınız"}>
        <Input value={profile.fullName} onChange={(event) => onChange("fullName", event.target.value)} placeholder={isDealer ? "Yetkili kişi adı" : "Adınız"} />
      </Field>
      <Field label={isDealer ? "Galeri adı" : "Görünen ad"}>
        <Input value={profile.displayName} onChange={(event) => onChange("displayName", event.target.value)} placeholder={isDealer ? "Galeri adı" : "Görünen ad"} />
      </Field>
      <Field label="Şehir">
        <Select value={profile.city} onChange={(event) => onChange("city", event.target.value)}>
          <option value="">Şehir seçin</option>
          {cities.map((city) => <option key={city} value={city}>{cityLabel(city, locale)}</option>)}
        </Select>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-bold text-oto-muted">{label}</span>
      {children}
    </label>
  );
}

function PriceSuggestionCard({
  suggestion,
  currency,
  locale
}: {
  suggestion: ReturnType<typeof getPriceSuggestion>;
  currency: string;
  locale: "tr" | "en";
}) {
  return (
    <div className="rounded-oto border border-oto-border bg-oto-surface p-4">
      <h3 className="text-base font-black text-oto-text">Tahmini piyasa fiyatı</h3>
      {suggestion ? (
        <div className="mt-3 grid gap-2 text-sm font-semibold text-oto-muted">
          <p>{locale === "en" ? "Similar listing range" : "Benzer ilan aralığı"}: {formatPrice(suggestion.minPrice, currency, locale)} - {formatPrice(suggestion.maxPrice, currency, locale)}</p>
          <p>{locale === "en" ? "Suggested price for a faster sale" : "Daha hızlı satış için önerilen fiyat"}: {formatPrice(suggestion.averagePrice, currency, locale)}</p>
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

function QualityScore({ score, items }: { score: number; items: QualityItem[] }) {
  return (
    <div className="rounded-oto bg-oto-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-oto-text">İlan kalitesi: {score}%</p>
        <span className="text-xs font-bold text-oto-muted">{score >= 80 ? "Çok iyi" : score >= 55 ? "İyi" : "Eksik"}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-oto-blue" style={{ width: `${score}%` }} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <span key={item.label} className={item.complete ? "rounded-md bg-white px-3 py-2 text-xs font-bold text-oto-success" : "rounded-md bg-white px-3 py-2 text-xs font-bold text-oto-muted"}>
            {item.complete ? "Tamamlandı" : "Eksik"} · {item.label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm leading-6 text-oto-muted">
        Bu skor ilan tamlığı içindir; araç doğrulaması veya güven raporu anlamına gelmez.
      </p>
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

function SuccessState({ onCreateNew }: { onCreateNew: () => void }) {
  return (
    <Panel title="İlanınız alındı">
      <p className="text-sm leading-6 text-oto-muted">
        İlanınız moderasyon kontrolüne gönderildi. Onaylandıktan sonra yayına alınacaktır.
      </p>
      <div className="grid gap-3 rounded-oto border border-oto-border bg-oto-surface p-4 sm:grid-cols-2">
        <ButtonLink href="/my-listings">İlanımı görüntüle</ButtonLink>
        <ButtonLink href="/my-listings" variant="secondary">İlanlarım</ButtonLink>
        <ButtonLink href="/" variant="secondary">Ana sayfaya dön</ButtonLink>
        <Button type="button" variant="orange" onClick={onCreateNew}>Yeni ilan oluştur</Button>
      </div>
    </Panel>
  );
}

function toSellerProfile(profile: Profile | null, authPhone: string, locale: string): SellerProfileState {
  const fullName = profile?.full_name?.trim() || [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim();
  const phone = profile?.phone?.trim() || authPhone;

  return {
    fullName,
    displayName: profile?.display_name?.trim() || fullName || phone,
    phone,
    city: profile?.city ?? "",
    sellerType: profile?.seller_type ?? "private",
    language: profile?.language ?? locale,
    country: profile?.country ?? "TR",
    timezone: profile?.timezone ?? "Europe/Istanbul"
  };
}

function generateListingTitle(make?: Make, model?: Model, year?: string) {
  return [make?.make_name, model?.model_name, year].map((item) => item?.toString().trim()).filter(Boolean).join(" ");
}

function calculateQualityScore(state: WizardState) {
  let score = 0;
  if (state.photos.length >= 5) score += 30;
  else if (state.photos.length >= 3) score += 20;
  if (state.description.trim().length >= 100) score += 20;
  if (Number(state.priceAmount) > 0) score += 15;
  if (state.city) score += 10;
  if (state.makeId && state.modelId && state.year) score += 15;
  if ([state.mileageKm, state.fuelType, state.transmission, state.bodyType, state.driveType, state.color, state.damageState].filter(Boolean).length >= 5) score += 10;
  return Math.min(score, 100);
}

function getQualityItems(state: WizardState, profileComplete: boolean): QualityItem[] {
  return [
    { label: "Satıcı bilgileri", complete: profileComplete },
    { label: "Araç bilgileri", complete: Boolean(state.makeId && state.modelId && state.year && validYear(state.year)) },
    { label: "Fiyat girildi", complete: Number(state.priceAmount) > 0 },
    { label: "Şehir seçildi", complete: Boolean(state.city) },
    { label: "Açıklama eklendi", complete: state.description.trim().length >= 60 },
    { label: "En az 3 fotoğraf", complete: state.photos.length >= 3 },
    { label: "Kapak fotoğrafı seçildi", complete: state.photos.some((photo) => photo.isCover) },
    { label: "Hasar bilgisi açıklandı", complete: Boolean(state.damageState && state.damageState !== "unknown") }
  ];
}

function validateSellerProfile(profile: SellerProfileState) {
  if (!profile.sellerType) return "Satıcı türünü seçin.";
  if (!profile.phone.trim()) return "Telefon bilginiz eksik. Lütfen tekrar giriş yapın.";
  if (!profile.city) return "Şehir seçin.";
  if (!profile.fullName.trim()) return profile.sellerType === "dealer" ? "Yetkili kişi adını girin." : "Adınızı girin.";
  if (!profile.displayName.trim()) return profile.sellerType === "dealer" ? "Galeri adını girin." : "Görünen adınızı girin.";
  return null;
}

function validateStep(step: number, state: WizardState) {
  if (step === 2) {
    if (!state.makeId || !state.modelId || !state.year) return "Marka, model ve yıl alanlarını doldurun.";
    if (!validYear(state.year)) return "Geçerli bir yıl girin.";
  }
  if (step === 3) {
    if (state.condition === "used" && !state.mileageKm) return "İkinci el araçlar için kilometre girin.";
    if (state.mileageKm && Number(state.mileageKm) < 0) return "Geçerli bir kilometre girin.";
  }
  if (step === 5) {
    if (Number(state.priceAmount) <= 0) return "Geçerli bir fiyat girin.";
    if (!state.city) return "Şehir seçin.";
  }
  return null;
}

function validateForPublish(state: WizardState) {
  return validateStep(2, state) || validateStep(3, state) || validateStep(5, state);
}

function validYear(value: string) {
  const year = Number(value);
  const maxYear = new Date().getFullYear() + 1;
  return Number.isInteger(year) && year >= 1900 && year <= maxYear;
}

async function uploadPhotoMedia({
  supabase,
  userId,
  vehicleProfileId,
  photo,
  sortOrder,
  onStatus
}: {
  supabase: ReturnType<typeof getSupabaseBrowserClient>;
  userId: string;
  vehicleProfileId: string;
  photo: PhotoItem;
  sortOrder: number;
  onStatus: (statusText: string) => void;
}) {
  const mediaId = crypto.randomUUID();
  const uploads: Partial<Record<PreparedImageVariantName, { path: string; url: string }>> = {};
  const variants = getUploadVariants(photo);

  for (const item of variants) {
    onStatus(`${variantStatusLabel(item.name)} yükleniyor`);
    const path = `${userId}/${vehicleProfileId}/${mediaId}/${item.name}/${item.name}.${item.extension}`;
    const { error } = await supabase.storage.from("listing-media").upload(path, item.file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: item.mimeType
    });

    if (error) {
      if (item.required) {
        throw error;
      }

      logClientError(`sell.uploadPhoto.${item.name}`, error);
      continue;
    }

    const { data: publicUrl } = supabase.storage.from("listing-media").getPublicUrl(path);
    uploads[item.name] = { path, url: publicUrl.publicUrl };
  }

  const metadata = photo.prepared?.variants.original;
  const legacyUrl = uploads.large?.url ?? uploads.card?.url ?? uploads.original?.url;
  const legacyPath = uploads.large?.path ?? uploads.card?.path ?? uploads.original?.path;

  if (!legacyUrl || !legacyPath) {
    throw new Error("Photo upload did not produce a usable URL");
  }

  return {
    id: mediaId,
    vehicle_profile_id: vehicleProfileId,
    storage_path: legacyPath,
    url: legacyUrl,
    original_path: uploads.original?.path ?? null,
    large_path: uploads.large?.path ?? null,
    card_path: uploads.card?.path ?? null,
    thumb_path: uploads.thumb?.path ?? null,
    original_url: uploads.original?.url ?? null,
    large_url: uploads.large?.url ?? null,
    card_url: uploads.card?.url ?? null,
    thumb_url: uploads.thumb?.url ?? null,
    media_type: "image",
    sort_order: sortOrder,
    is_cover: photo.isCover,
    width: metadata?.width ?? null,
    height: metadata?.height ?? null,
    aspect_ratio: metadata ? Number((metadata.width / metadata.height).toFixed(4)) : null,
    mime_type: metadata?.mimeType ?? photo.file.type,
    size_bytes: metadata?.sizeBytes ?? photo.file.size,
    processed_status: photo.prepared ? "processed" : "failed",
    processing_error: photo.prepared ? null : "Browser image preprocessing was unavailable; legacy URL fallback stored.",
    blur_status: "not_started",
    has_detected_plate: null,
    processed_at: new Date().toISOString()
  };
}

function getUploadVariants(photo: PhotoItem) {
  if (photo.prepared) {
    return (["original", "large", "card", "thumb"] as PreparedImageVariantName[]).map((name) => ({
      ...photo.prepared!.variants[name],
      required: name === "original" || name === "large"
    }));
  }

  return [
    {
      name: "original" as const,
      file: photo.file,
      mimeType: photo.file.type,
      sizeBytes: photo.file.size,
      extension: extensionFromMimeType(photo.file.type, photo.file.name),
      width: 0,
      height: 0,
      required: true
    }
  ];
}

function variantStatusLabel(name: PreparedImageVariantName) {
  const labels: Record<PreparedImageVariantName, string> = {
    original: "Orijinal görsel",
    large: "Detay görseli",
    card: "Kart görseli",
    thumb: "Küçük önizleme"
  };

  return labels[name];
}

function extensionFromMimeType(mimeType: string, fileName: string) {
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/jpeg") return "jpg";
  return fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
}

function hasUnsavedDraft(state: WizardState) {
  return Boolean(
    state.makeId ||
    state.modelId ||
    state.year ||
    state.mileageKm ||
    state.priceAmount ||
    state.description.trim() ||
    state.photos.length > 0
  );
}

function draftStorageKey(userId: string) {
  return `otoyali:sell-draft:${userId}`;
}

function readStoredDraft(userId: string): PersistedWizardState | null {
  try {
    const raw = window.localStorage.getItem(draftStorageKey(userId));
    return raw ? (JSON.parse(raw) as PersistedWizardState) : null;
  } catch {
    return null;
  }
}

function saveStoredDraft(userId: string, state: WizardState) {
  try {
    const draft: PersistedWizardState = {
      makeId: state.makeId,
      modelId: state.modelId,
      year: state.year,
      city: state.city,
      condition: state.condition,
      sellerType: state.sellerType,
      mileageKm: state.mileageKm,
      fuelType: state.fuelType,
      transmission: state.transmission,
      bodyType: state.bodyType,
      driveType: state.driveType,
      color: state.color,
      engineVolumeL: state.engineVolumeL,
      damageState: state.damageState,
      ownerCount: state.ownerCount,
      priceAmount: state.priceAmount,
      currency: state.currency,
      priceNegotiable: state.priceNegotiable,
      description: state.description
    };
    window.localStorage.setItem(draftStorageKey(userId), JSON.stringify(draft));
  } catch {
    // Draft persistence is best-effort and must not block publishing.
  }
}

function clearStoredDraft(userId: string) {
  try {
    window.localStorage.removeItem(draftStorageKey(userId));
  } catch {
    // Best-effort cleanup only.
  }
}

function logClientError(context: string, detail: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[${context}]`, detail);
  }
}
