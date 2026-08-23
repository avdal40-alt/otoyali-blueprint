"use client";

import { FormEvent, type ReactNode, useCallback, useMemo, useRef, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { City, HomeListing, Make, Model, Profile } from "@/lib/supabase/types";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { ErrorState, LoadingState } from "@/components/ui/States";
import { SafeImage } from "@/components/ui/SafeImage";
import { bodyTypeLabel, cityLabel, colorLabel, conditionLabel, damageStateLabel, driveTypeLabel, formatMileage, formatPrice, fuelLabel, sellerTypeLabel, transmissionLabel } from "@/lib/format";
import { getPriceSuggestion } from "@/lib/market-price/analysis";
import { prepareImageVariants, type PreparedImageSet, type PreparedImageVariantName } from "@/lib/media/client-image-processing";
import { localizePath } from "@/i18n/config";
import type { Locale } from "@/i18n/types";
import { generateVehicleListingTitle } from "@/lib/marketplace/listing-title";
import { isCurrentEditTarget, LatestRequestGuard } from "../sell-route-state";
import { getSellCatalogDisplayName, getSellCopy, getSellModelRequestContextKey, getVariantUploadStatus, isSellCatalogOther, type SellCopy } from "../sell-copy";

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

type ExistingMedia = {
  id: string;
  url: string;
  thumb_url?: string | null;
  card_url?: string | null;
  large_url?: string | null;
  is_cover: boolean;
  sort_order: number;
};

export type SellWizardMode = "create" | "editRejected";

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
type EditableField = Exclude<keyof WizardState, "photos" | "sellerType">;
type OriginalEditSnapshot = Record<EditableField, string | boolean | null>;

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

const fuelOptions = ["gasoline", "diesel", "hybrid", "electric", "lpg", "other"];
const transmissionOptions = ["automatic", "manual", "semi_automatic"];
const bodyTypeOptions = ["sedan", "hatchback", "suv", "coupe", "wagon", "pickup", "minivan", "commercial", "other"];
const driveTypeOptions = ["front", "rear", "4x4", "awd"];
const damageOptions = ["unknown", "none", "painted", "replaced", "heavy_damage"];
const colorOptions = ["", "white", "black", "gray", "blue", "red", "silver"];

export function SellWizard({
  mode,
  editListingId,
  locale,
  makes,
  models,
  cities,
  listings
}: {
  mode: SellWizardMode;
  editListingId: string | null;
  locale: Locale;
  makes: Make[];
  models: Model[];
  cities?: City[];
  listings: HomeListing[];
}) {
  const copy = getSellCopy(locale);
  const steps = copy.steps;
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
  const [existingMedia, setExistingMedia] = useState<ExistingMedia[]>([]);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(null);
  const [expectedVehicleUpdatedAt, setExpectedVehicleUpdatedAt] = useState<string | null>(null);
  const [originalEditSnapshot, setOriginalEditSnapshot] = useState<OriginalEditSnapshot | null>(null);
  const [dirtyEditFields, setDirtyEditFields] = useState<Set<EditableField>>(() => new Set());
  const [editSaved, setEditSaved] = useState<"rejected" | "pending_review" | null>(null);
  const [existingTitle, setExistingTitle] = useState("");
  const [existingTitleGenerated, setExistingTitleGenerated] = useState(true);
  const [existingQualityScore, setExistingQualityScore] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [loadedRouteKey, setLoadedRouteKey] = useState<string | null>(null);
  const [loadedEditListingId, setLoadedEditListingId] = useState<string | null>(null);
  const routeRequestGuard = useRef(new LatestRequestGuard());
  const submissionRequestGuard = useRef(new LatestRequestGuard());
  const profileRequestGuard = useRef(new LatestRequestGuard());
  const modelRequestGuard = useRef(new LatestRequestGuard());
  const photoRequestGuards = useRef(new Map<string, LatestRequestGuard>());
  const mounted = useRef(false);
  const renderedRouteKey = useRef<string | null>(null);
  const renderedModelRequestContextKey = useRef<string | null>(null);
  const routeKey = mode === "editRejected" ? `edit:${editListingId ?? "invalid"}` : "create";
  if (renderedRouteKey.current !== routeKey) {
    renderedRouteKey.current = routeKey;
    routeRequestGuard.current.setTarget(routeKey);
    submissionRequestGuard.current.setTarget(routeKey);
    profileRequestGuard.current.setTarget(routeKey);
  }
  const modelRequestContextKey = getSellModelRequestContextKey(routeKey, locale);
  if (renderedModelRequestContextKey.current !== modelRequestContextKey) {
    renderedModelRequestContextKey.current = modelRequestContextKey;
    modelRequestGuard.current.setTarget(modelRequestContextKey);
  }
  const sell03 = copy;

  const loadModelsForMake = useCallback(async (makeId: string) => {
    if (!hasSupabaseEnv()) return;

    const routeToken = routeRequestGuard.current.currentToken();
    const requestToken = modelRequestGuard.current.begin(`make:${makeId}`);
    const isCurrentRequest = () => mounted.current
      && routeRequestGuard.current.isCurrent(routeToken)
      && modelRequestGuard.current.isCurrent(requestToken);
    setModelsLoading(true);
    setModelsError(null);
    const supabase = getSupabaseBrowserClient();
    const { data, error: loadError } = await supabase
      .from("ff_models")
      .select("model_id,make_id,make_name,model_name,model_slug")
      .eq("make_id", makeId)
      .order("model_name", { ascending: true });

    if (!isCurrentRequest()) return;

    if (loadError) {
      logClientError("sell.loadModels", loadError);
      setModelsError(copy.modelsLoadFailure);
      setModelsForMake([]);
    } else {
      setModelsForMake((data ?? []) as Model[]);
    }

    if (isCurrentRequest()) setModelsLoading(false);
  }, [copy.modelsLoadFailure]);

  useEffect(() => {
    const routeGuard = routeRequestGuard.current;
    const submissionGuard = submissionRequestGuard.current;
    const profileGuard = profileRequestGuard.current;
    const modelGuard = modelRequestGuard.current;
    const photoGuards = photoRequestGuards.current;
    mounted.current = true;
    return () => {
      mounted.current = false;
      routeGuard.invalidate();
      submissionGuard.invalidate();
      profileGuard.invalidate();
      modelGuard.invalidate();
      photoGuards.forEach((guard) => guard.invalidate());
      photoGuards.clear();
    };
  }, []);

  useEffect(() => {
    const routeRequestToken = routeRequestGuard.current.currentToken();
    let active = true;
    const isCurrentRequest = () => mounted.current
      && active
      && routeRequestGuard.current.isCurrent(routeRequestToken);

    setCheckingAuth(true);
    setLoadedRouteKey(null);
    setLoadedEditListingId(null);
    setStep(1);
    setState(initialState);
    setProfileSaving(false);
    setError(null);
    setSubmitting(false);
    setRulesAccepted(false);
    setPublishStatus(null);
    setPublishedListingId(null);
    setModelsForMake(models);
    setModelsLoading(false);
    setModelsError(null);
    setExistingMedia([]);
    setExpectedUpdatedAt(null);
    setExpectedVehicleUpdatedAt(null);
    setOriginalEditSnapshot(null);
    setDirtyEditFields(new Set());
    setEditSaved(null);
    setExistingTitle("");
    setExistingTitleGenerated(true);
    setExistingQualityScore(null);
    setRejectionReason("");

    async function checkAuth() {
      if (!hasSupabaseEnv()) {
        if (!isCurrentRequest()) return;
        setError(copy.missingSupabaseEnv);
        setLoadedRouteKey(routeKey);
        setCheckingAuth(false);
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getUser();
      if (!isCurrentRequest()) return;
      if (!data.user) {
        const sellReturnPath = mode === "editRejected" && editListingId
          ? `${localizePath("/sell", locale)}?edit=${editListingId}`
          : localizePath("/sell", locale);
        router.replace(`${localizePath("/login", locale)}?next=${encodeURIComponent(sellReturnPath)}`);
        return;
      }

      setUserId(data.user.id);
      const { data: profileRow } = await supabase.from("profiles").select("*").eq("id", data.user.id).maybeSingle();
      if (!isCurrentRequest()) return;
      const sellerProfile = toSellerProfile((profileRow as Profile | null) ?? null, data.user.phone ?? "", locale);
      setProfile(sellerProfile);
      if (mode === "editRejected") {
        if (!editListingId) {
          setError(sell03.listingUnavailable);
          setLoadedRouteKey(routeKey);
          setCheckingAuth(false);
          return;
        }
        const { data: editData, error: editError } = await supabase.rpc("get_own_rejected_listing_for_edit", {
          p_listing_id: editListingId
        });
        if (!isCurrentRequest()) return;
        if (editError || !editData) {
          setError(sell03.listingUnavailable);
          setLoadedRouteKey(routeKey);
          setCheckingAuth(false);
          return;
        }
        const edit = editData as {
          listing: Record<string, unknown>;
          vehicle: Record<string, unknown>;
          media: ExistingMedia[];
        };
        const listing = edit.listing;
        const vehicle = edit.vehicle;
        setExistingTitle(String(listing.title ?? ""));
        setExistingTitleGenerated(Boolean(listing.title_generated));
        setExistingQualityScore(typeof listing.quality_score === "number" ? listing.quality_score : null);
        setRejectionReason(String(listing.rejection_reason ?? listing.moderation_note ?? ""));
        const loadedState: WizardState = {
          makeId: String(vehicle.make_id ?? ""),
          modelId: String(vehicle.model_id ?? ""),
          year: String(vehicle.year ?? ""),
          city: String(listing.city ?? ""),
          condition: String(vehicle.condition ?? "used"),
          sellerType: String(listing.seller_type ?? sellerProfile.sellerType),
          mileageKm: String(vehicle.mileage_km ?? ""),
          fuelType: String(vehicle.fuel_type ?? "gasoline"),
          transmission: String(vehicle.transmission ?? "automatic"),
          bodyType: String(vehicle.body_type ?? ""),
          driveType: String(vehicle.drive_type ?? ""),
          color: String(vehicle.color ?? ""),
          engineVolumeL: vehicle.engine_volume_l == null ? "" : String(vehicle.engine_volume_l),
          damageState: String(vehicle.damage_state ?? "unknown"),
          ownerCount: vehicle.owner_count == null ? "" : String(vehicle.owner_count),
          priceAmount: String(listing.price_amount ?? ""),
          currency: String(listing.currency ?? "TRY").trim(),
          priceNegotiable: Boolean(listing.price_negotiable),
          description: String(listing.description ?? ""),
          photos: []
        };
        setState(loadedState);
        setOriginalEditSnapshot({
          makeId: String(vehicle.make_id ?? ""),
          modelId: String(vehicle.model_id ?? ""),
          year: String(vehicle.year ?? ""),
          city: listing.city == null ? null : String(listing.city),
          condition: vehicle.condition == null ? null : String(vehicle.condition),
          mileageKm: String(vehicle.mileage_km ?? ""),
          fuelType: vehicle.fuel_type == null ? null : String(vehicle.fuel_type),
          transmission: vehicle.transmission == null ? null : String(vehicle.transmission),
          bodyType: vehicle.body_type == null ? null : String(vehicle.body_type),
          driveType: vehicle.drive_type == null ? null : String(vehicle.drive_type),
          color: vehicle.color == null ? null : String(vehicle.color),
          engineVolumeL: vehicle.engine_volume_l == null ? null : String(vehicle.engine_volume_l),
          damageState: vehicle.damage_state == null ? null : String(vehicle.damage_state),
          ownerCount: vehicle.owner_count == null ? null : String(vehicle.owner_count),
          priceAmount: String(listing.price_amount ?? ""),
          currency: listing.currency == null ? null : String(listing.currency),
          priceNegotiable: Boolean(listing.price_negotiable),
          description: listing.description == null ? null : String(listing.description)
        });
        setDirtyEditFields(new Set());
        setExpectedUpdatedAt(String(listing.updated_at));
        setExpectedVehicleUpdatedAt(String(vehicle.updated_at));
        setExistingMedia([...(edit.media ?? [])].sort((a, b) => a.sort_order - b.sort_order));
        void loadModelsForMake(String(vehicle.make_id ?? ""));
        setLoadedEditListingId(editListingId);
        setLoadedRouteKey(routeKey);
        setCheckingAuth(false);
        return;
      }
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
      setLoadedRouteKey(routeKey);
      setCheckingAuth(false);
    }

    void checkAuth();
    return () => {
      active = false;
    };
  }, [copy.missingSupabaseEnv, editListingId, loadModelsForMake, locale, mode, models, routeKey, router, sell03.listingUnavailable]);

  useEffect(() => {
    if (mode !== "create" || checkingAuth || loadedRouteKey !== routeKey || !userId || publishedListingId) return;
    saveStoredDraft(userId, state);
  }, [checkingAuth, loadedRouteKey, mode, publishedListingId, routeKey, state, userId]);

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
  const generatedTitle = generateVehicleListingTitle({
    makeName: selectedMake?.make_name,
    modelName: selectedModel?.make_id === state.makeId ? selectedModel.model_name : null,
    year: state.year
  });
  const qualityScore = calculateQualityScore(state);
  const displayTitle = mode === "editRejected"
    ? (existingTitleGenerated ? generatedTitle : existingTitle)
    : generatedTitle;
  const displayQualityScore = mode === "editRejected" ? existingQualityScore : qualityScore;
  const profileValidation = profile ? validateSellerProfile(profile, copy) : copy.profileIncomplete;
  const profileComplete = !profileValidation;
  const qualityItems = getQualityItems(state, profileComplete, copy);
  const usesFallbackCatalogOption = Boolean(
    (selectedMake && isSellCatalogOther(selectedMake))
    || (selectedModel && isSellCatalogOther(selectedModel))
  );
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
    if (mode === "editRejected" && key !== "photos" && key !== "sellerType") {
      setDirtyEditFields((current) => new Set(current).add(key));
      if (key === "fuelType" && value === "electric") {
        setDirtyEditFields((current) => new Set(current).add("engineVolumeL"));
      }
    }
    setState((current) => ({
      ...current,
      [key]: value,
      ...(key === "fuelType" && value === "electric" ? { engineVolumeL: "" } : {})
    }));
  }

  function updateMake(makeId: string) {
    if (mode === "editRejected") {
      setDirtyEditFields((current) => new Set(current).add("makeId").add("modelId"));
    }
    setState((current) => ({ ...current, makeId, modelId: "" }));
    setModelsForMake([]);
    setModelsError(null);
    if (!makeId) {
      modelRequestGuard.current.invalidate();
      setModelsLoading(false);
    }
    if (makeId) {
      void loadModelsForMake(makeId);
    }
  }

  function updateProfile<K extends keyof SellerProfileState>(key: K, value: SellerProfileState[K]) {
    setProfile((current) => current ? { ...current, [key]: value } : current);
    if (key === "city" || key === "sellerType") {
      if (mode === "editRejected" && key === "city") {
        setDirtyEditFields((current) => new Set(current).add("city"));
      }
      setState((current) => ({ ...current, [key === "city" ? "city" : "sellerType"]: value }));
    }
  }

  async function persistProfile(parentIsCurrent: () => boolean = () => true) {
    if (!profile || !userId) return false;
    const validation = validateSellerProfile(profile, copy);
    if (validation) {
      setError(validation);
      return false;
    }
    const routeToken = routeRequestGuard.current.currentToken();
    const requestToken = profileRequestGuard.current.begin(routeKey);
    const isCurrentRequest = () => mounted.current
      && parentIsCurrent()
      && routeRequestGuard.current.isCurrent(routeToken)
      && profileRequestGuard.current.isCurrent(requestToken);

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

    if (!isCurrentRequest()) return false;

    if (profileError) {
      logClientError("sell.saveProfile", profileError);
      setError(copy.profileSaveFailure);
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
      setError(copy.tooManyPhotos);
      return;
    }

    const invalid = nextFiles.find((file) => !allowedMimeTypes.includes(file.type) || file.size > maxFileSize);
    if (invalid) {
      setError(copy.invalidPhoto);
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
      statusText: copy.optimizingImages,
      error: null,
      prepared: null
    }));
    setState((current) => ({ ...current, photos: [...current.photos, ...photoItems] }));
    photoItems.forEach((photo) => {
      void processPhoto(photo.id, photo.file);
    });
  }

  async function processPhoto(photoId: string, file: File) {
    const routeToken = routeRequestGuard.current.currentToken();
    const photoGuard = photoRequestGuards.current.get(photoId) ?? new LatestRequestGuard();
    photoRequestGuards.current.set(photoId, photoGuard);
    const requestToken = photoGuard.begin(photoId);
    const isCurrentRequest = () => mounted.current
      && routeRequestGuard.current.isCurrent(routeToken)
      && photoGuard.isCurrent(requestToken);
    updatePhoto(photoId, {
      processingStatus: "processing",
      statusText: copy.optimizingImages,
      error: null
    });

    try {
      const prepared = await prepareImageVariants(file);
      if (!isCurrentRequest()) return;
      updatePhoto(photoId, {
        processingStatus: "ready",
        statusText: copy.photoReady,
        prepared
      });
    } catch (processingError) {
      if (!isCurrentRequest()) return;
      logClientError("sell.processPhoto", processingError);
      updatePhoto(photoId, {
        processingStatus: "failed",
        statusText: copy.photoProcessingFailed,
        error: copy.photoProcessingFallback,
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
    photoRequestGuards.current.get(photoId)?.invalidate();
    photoRequestGuards.current.delete(photoId);
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

    const validation = validateStep(step, state, sell03);
    if (validation) {
      setError(validation);
      return;
    }
    setError(null);
    setStep((current) => Math.min(steps.length, current + 1));
  }

  async function saveRejected(sendForReview: boolean) {
    setError(null);
    setEditSaved(null);
    if (
      !mounted.current
      || mode !== "editRejected"
      || !isCurrentEditTarget(editListingId, loadedEditListingId, routeKey, loadedRouteKey)
      || !expectedUpdatedAt
      || !expectedVehicleUpdatedAt
      || !profile
      || !originalEditSnapshot
    ) {
      setError(sell03.listingUnavailable);
      return;
    }
    const validation = validateForPublish(state, sell03);
    if (validation) {
      setError(validation);
      return;
    }

    const routeToken = routeRequestGuard.current.currentToken();
    const submissionToken = submissionRequestGuard.current.begin(routeKey);
    const isCurrentSubmission = () => mounted.current
      && routeRequestGuard.current.isCurrent(routeToken)
      && submissionRequestGuard.current.isCurrent(submissionToken)
      && mode === "editRejected"
      && loadedRouteKey === routeKey
      && isCurrentEditTarget(editListingId, loadedEditListingId, routeKey, loadedRouteKey);
    setSubmitting(true);
    setPublishStatus(sell03.saveProgress);
    const supabase = getSupabaseBrowserClient();
    const raw = <K extends EditableField>(key: K, changedValue: OriginalEditSnapshot[K]) =>
      dirtyEditFields.has(key) ? changedValue : originalEditSnapshot[key];
    const submittedSnapshot: OriginalEditSnapshot = {
      makeId: raw("makeId", state.makeId),
      modelId: raw("modelId", state.modelId),
      year: raw("year", state.year),
      mileageKm: raw("mileageKm", state.mileageKm),
      condition: raw("condition", state.condition),
      fuelType: raw("fuelType", state.fuelType),
      transmission: raw("transmission", state.transmission),
      bodyType: raw("bodyType", state.bodyType || null),
      driveType: raw("driveType", state.driveType || null),
      color: raw("color", state.color || null),
      engineVolumeL: raw("engineVolumeL", state.fuelType === "electric" ? null : state.engineVolumeL),
      damageState: raw("damageState", state.damageState || null),
      ownerCount: raw("ownerCount", state.ownerCount || null),
      description: raw("description", state.description),
      priceAmount: raw("priceAmount", state.priceAmount),
      currency: raw("currency", state.currency),
      priceNegotiable: raw("priceNegotiable", state.priceNegotiable),
      city: raw("city", state.city)
    };
    const { data: savedRows, error: saveError } = await supabase.rpc("save_own_rejected_listing", {
      p_listing_id: editListingId,
      p_expected_listing_updated_at: expectedUpdatedAt,
      p_expected_vehicle_updated_at: expectedVehicleUpdatedAt,
      p_make_id: raw("makeId", state.makeId),
      p_model_id: raw("modelId", state.modelId),
      p_year: Number(raw("year", state.year)),
      p_mileage_km: Number(raw("mileageKm", state.mileageKm)),
      p_condition: raw("condition", state.condition),
      p_fuel_type: raw("fuelType", state.fuelType),
      p_transmission: raw("transmission", state.transmission),
      p_body_type: raw("bodyType", state.bodyType || null),
      p_drive_type: raw("driveType", state.driveType || null),
      p_color: raw("color", state.color || null),
      p_engine_volume_l: raw("engineVolumeL", state.fuelType === "electric" ? null : state.engineVolumeL),
      p_damage_state: raw("damageState", state.damageState || null),
      p_owner_count: (() => {
        const value = raw("ownerCount", state.ownerCount || null);
        return value == null ? null : Number(value);
      })(),
      p_description: raw("description", state.description),
      p_price_amount_text: raw("priceAmount", state.priceAmount),
      p_currency: raw("currency", state.currency),
      p_price_negotiable: raw("priceNegotiable", state.priceNegotiable),
      p_city: raw("city", state.city)
    });
    if (!isCurrentSubmission()) return;
    if (saveError) {
      logClientError("sell.saveRejected", saveError);
      setError(editErrorMessage(saveError, sell03));
      setSubmitting(false);
      setPublishStatus(null);
      return;
    }

    const saved = Array.isArray(savedRows) ? savedRows[0] : savedRows;
    if (saved && typeof saved === "object") {
      if ("saved_listing_updated_at" in saved) setExpectedUpdatedAt(String(saved.saved_listing_updated_at));
      if ("saved_vehicle_updated_at" in saved) setExpectedVehicleUpdatedAt(String(saved.saved_vehicle_updated_at));
      if ("saved_title" in saved) setExistingTitle(String(saved.saved_title));
      if ("saved_title_generated" in saved) setExistingTitleGenerated(Boolean(saved.saved_title_generated));
    }
    setOriginalEditSnapshot(submittedSnapshot);
    setDirtyEditFields(new Set());
    if (sendForReview) {
      if (!isCurrentSubmission()) return;
      setPublishStatus(sell03.resubmitProgress);
      let resubmitError: unknown;
      try {
        ({ error: resubmitError } = await supabase.rpc("resubmit_own_listing_for_review", {
          p_listing_id: editListingId
        }));
      } catch (resubmitRequestError) {
        if (!isCurrentSubmission()) return;
        logClientError("sell.resubmitRejected", resubmitRequestError);
        setError(editErrorMessage(null, sell03, true));
        setSubmitting(false);
        setPublishStatus(null);
        return;
      }
      if (!isCurrentSubmission()) return;
      if (resubmitError) {
        logClientError("sell.resubmitRejected", resubmitError);
        setError(editErrorMessage(resubmitError, sell03, true));
        setSubmitting(false);
        setPublishStatus(null);
        return;
      }
      setRejectionReason("");
      setEditSaved("pending_review");
    } else {
      setEditSaved("rejected");
    }
    setSubmitting(false);
    setPublishStatus(null);
  }

  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!mounted.current || mode !== "create" || routeKey !== "create" || loadedRouteKey !== routeKey) return;
    setError(null);

    if (!userId) {
      router.replace(`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath("/sell", locale))}`);
      return;
    }

    if (!profileComplete || !profile) {
      setError(copy.completeProfileBeforePublish);
      return;
    }

    if (!rulesAccepted) {
      setError(copy.acceptRules);
      return;
    }

    const validation = validateForPublish(state, sell03);
    if (validation) {
      setError(validation);
      return;
    }

    const routeToken = routeRequestGuard.current.currentToken();
    const submissionToken = submissionRequestGuard.current.begin(routeKey);
    const isCurrentPublication = () => mounted.current
      && mode === "create"
      && routeKey === "create"
      && loadedRouteKey === routeKey
      && routeRequestGuard.current.isCurrent(routeToken)
      && submissionRequestGuard.current.isCurrent(submissionToken);
    setSubmitting(true);
    setPublishStatus(copy.checkingSeller);
    const profileSaved = await persistProfile(isCurrentPublication);
    if (!isCurrentPublication()) return;
    if (!profileSaved) {
      setSubmitting(false);
      setPublishStatus(null);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    setPublishStatus(copy.creatingVehicleProfile);

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

    if (!isCurrentPublication()) return;
    if (profileError || !vehicleProfile) {
      logClientError("sell.createVehicleProfile", profileError);
      setSubmitting(false);
      setPublishStatus(null);
      setError(copy.vehicleSaveFailure);
      return;
    }

    const vehicleProfileId = vehicleProfile.id as string;
    setPublishStatus(copy.verifyingOwnership);
    const { error: ownershipError } = await supabase.rpc("initialize_own_vehicle_profile_ownership", {
      p_vehicle_profile_id: vehicleProfileId
    });

    if (!isCurrentPublication()) return;
    if (ownershipError) {
      logClientError("sell.createOwnership", ownershipError);
      setSubmitting(false);
      setPublishStatus(null);
      setError(copy.ownershipSaveFailure);
      return;
    }

    setPublishStatus(copy.creatingDraft);
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

    if (!isCurrentPublication()) return;
    if (listingError || !listing) {
      logClientError("sell.createListing", listingError);
      setSubmitting(false);
      setPublishStatus(null);
      setError(copy.draftCreateFailure);
      return;
    }

    const listingId = listing.id as string;
    let coverMediaId: string | null = null;

    if (state.photos.length > 0) {
      const mediaRows = [];
      for (let index = 0; index < state.photos.length; index++) {
        if (!isCurrentPublication()) return;
        const photo = state.photos[index];
        setPublishStatus(copy.photosUploading(index + 1, state.photos.length));
        updatePhoto(photo.id, { uploadStatus: "uploading", statusText: copy.photosUploadingShort });

        try {
          const mediaUpload = await uploadPhotoMedia({
            supabase,
            userId,
            vehicleProfileId,
            photo,
            sortOrder: index,
            isCurrent: isCurrentPublication,
            copy,
            onStatus: (statusText) => {
              if (isCurrentPublication()) updatePhoto(photo.id, { uploadStatus: "uploading", statusText });
            }
          });
          if (!isCurrentPublication()) return;
          if (!mediaUpload) return;
          mediaRows.push(mediaUpload);
          updatePhoto(photo.id, { uploadStatus: "ready", statusText: copy.photoReady });
        } catch (uploadError) {
          if (!isCurrentPublication()) return;
          logClientError("sell.uploadPhoto", uploadError);
          updatePhoto(photo.id, { uploadStatus: "failed", statusText: copy.photoUploadFailure, error: copy.photoUploadFailure });
          setSubmitting(false);
          setPublishStatus(null);
          setError(copy.photoUploadFailure);
          return;
        }
      }

      const { data: insertedMedia, error: mediaError } = await supabase
        .schema("vehicle")
        .from("profile_media")
        .insert(mediaRows)
        .select("id,is_cover");

      if (!isCurrentPublication()) return;
      if (mediaError) {
        logClientError("sell.createMedia", mediaError);
        setSubmitting(false);
        setPublishStatus(null);
        setError(copy.photoSaveFailure);
        return;
      }

      coverMediaId = ((insertedMedia ?? []) as Array<{ id: string; is_cover: boolean }>).find((item) => item.is_cover)?.id ?? null;
    }

    setPublishStatus(copy.submittingForModeration);
    const { error: finalizeError } = await supabase
      .schema("marketplace")
      .from("listings")
      .update({
        quality_score: qualityScore,
        cover_media_id: coverMediaId
      })
      .eq("id", listingId);

    if (!isCurrentPublication()) return;
    if (finalizeError) {
      logClientError("sell.finalizeListingContent", finalizeError);
      setSubmitting(false);
      setPublishStatus(null);
      setError(copy.submitFailure);
      return;
    }

    const { error: submitError } = await supabase.rpc("submit_own_listing_for_review", {
      p_listing_id: listingId
    });

    if (!isCurrentPublication()) return;
    setSubmitting(false);
    setPublishStatus(null);

    if (submitError) {
      logClientError("sell.submitForReview", submitError);
      setError(copy.submitFailure);
      return;
    }

    clearStoredDraft(userId);
    state.photos.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    setPublishedListingId(listingId);
  }

  if (checkingAuth || loadedRouteKey !== routeKey) return <LoadingState label={copy.checkingSession} />;

  if (mode === "editRejected" && !isCurrentEditTarget(editListingId, loadedEditListingId, routeKey, loadedRouteKey)) {
    return <ErrorState message={error || sell03.listingUnavailable} />;
  }

  if (publishedListingId) {
    return (
      <SuccessState
        copy={copy}
        locale={locale}
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
        <Panel title={copy.completeProfileTitle}>
          <p className="text-sm leading-6 text-oto-muted">{copy.completeProfileBody}</p>
          <ProfileFields profile={profile} cities={cityOptions} onChange={updateProfile} locale={locale} copy={copy} />
          {error ? <ErrorState message={error} /> : null}
          <Button type="button" onClick={saveProfile} disabled={profileSaving}>
            {profileSaving ? copy.savingButton : copy.continue}
          </Button>
        </Panel>
      </div>
    );
  }

  return (
    <form onSubmit={publish} className="grid gap-5">
      {mode === "editRejected" && rejectionReason ? (
        <section className="rounded-oto border border-red-200 bg-red-50 p-5" aria-live="polite">
          <h2 className="text-base font-black text-red-900">{sell03.rejectionReasonHeading}</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-red-800">{rejectionReason}</p>
        </section>
      ) : null}
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
        <Panel title={copy.sellerInformation}>
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-oto-muted">
              {copy.sellerInformationHelp}
            </p>
            <ProfileFields profile={profile} cities={cityOptions} onChange={updateProfile} locale={locale} copy={copy} />
            {profile.sellerType === "dealer" ? (
              <p className="rounded-md bg-oto-surface px-3 py-2 text-xs font-bold leading-5 text-oto-muted">
                {copy.dealerVerificationHelp}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={saveProfile} disabled={profileSaving}>
                {profileSaving ? copy.savingButton : copy.saveInformation}
              </Button>
              <span className="self-center text-xs font-bold text-oto-muted">{copy.finalReviewHelp}</span>
            </div>
          </div>
        </Panel>
      ) : null}

      {step === 2 ? (
        <Panel title={copy.vehicleInformation}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={copy.make}>
              <Select value={state.makeId} onChange={(event) => updateMake(event.target.value)}>
                <option value="">{copy.selectMake}</option>
                {makes.map((make) => <option key={make.make_id} value={make.make_id}>{getSellCatalogDisplayName({ kind: "make", item: make, locale })}</option>)}
              </Select>
            </Field>
            <Field label={copy.model}>
              <Select value={state.modelId} onChange={(event) => update("modelId", event.target.value)} disabled={!state.makeId}>
                <option value="">{modelsLoading ? copy.modelsLoading : copy.selectModel}</option>
                {filteredModels.map((model) => <option key={model.model_id} value={model.model_id}>{getSellCatalogDisplayName({ kind: "model", item: model, locale })}</option>)}
              </Select>
              {modelsError ? <span className="text-xs font-bold text-oto-danger">{modelsError}</span> : null}
            </Field>
            <Field label={copy.year}>
              <Input value={state.year} onChange={(event) => update("year", event.target.value)} placeholder="2021" inputMode="numeric" />
            </Field>
            <Field label={copy.condition}>
              <Select value={state.condition} onChange={(event) => update("condition", event.target.value)}>
                <option value="used">{conditionLabel("used", locale)}</option>
                <option value="new">{conditionLabel("new", locale)}</option>
              </Select>
            </Field>
          </div>
          {usesFallbackCatalogOption ? (
            <p className="rounded-md bg-oto-surface px-3 py-2 text-sm font-semibold text-oto-muted">
              {copy.missingCatalogHelp}
            </p>
          ) : null}
        </Panel>
      ) : null}

      {step === 3 ? (
        <Panel title={copy.equipmentAndDescription}>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={copy.mileage}>
              <Input value={state.mileageKm} onChange={(event) => update("mileageKm", event.target.value)} placeholder="45000" inputMode="numeric" />
            </Field>
            <Field label={copy.fuelType}>
              <Select value={state.fuelType} onChange={(event) => update("fuelType", event.target.value)}>
                {fuelOptions.map((option) => <option key={option} value={option}>{fuelLabel(option, locale)}</option>)}
              </Select>
            </Field>
            <Field label={copy.transmission}>
              <Select value={state.transmission} onChange={(event) => update("transmission", event.target.value)}>
                {transmissionOptions.map((option) => <option key={option} value={option}>{transmissionLabel(option, locale)}</option>)}
              </Select>
            </Field>
            <Field label={copy.bodyType}>
              <Select value={state.bodyType} onChange={(event) => update("bodyType", event.target.value)}>
                <option value="">{copy.selectBodyType}</option>
                {bodyTypeOptions.map((option) => <option key={option} value={option}>{bodyTypeLabel(option, locale)}</option>)}
              </Select>
            </Field>
            <Field label={copy.driveType}>
              <Select value={state.driveType} onChange={(event) => update("driveType", event.target.value)}>
                <option value="">{copy.selectDriveType}</option>
                {driveTypeOptions.map((option) => <option key={option} value={option}>{driveTypeLabel(option, locale)}</option>)}
              </Select>
            </Field>
            <Field label={copy.color}>
              <Select value={state.color} onChange={(event) => update("color", event.target.value)}>
                {colorOptions.map((option) => <option key={option || "empty"} value={option}>{option ? colorLabel(option, locale) : copy.colors.empty}</option>)}
              </Select>
            </Field>
            {state.fuelType !== "electric" ? (
              <Field label={copy.engineDisplacement}>
                <Input value={state.engineVolumeL} onChange={(event) => update("engineVolumeL", event.target.value)} placeholder="1.6" inputMode="decimal" />
                {error === copy.combustionDisplacement ? <span className="text-xs font-bold text-oto-danger">{error}</span> : null}
              </Field>
            ) : null}
            <Field label={copy.damageState}>
              <Select value={state.damageState} onChange={(event) => update("damageState", event.target.value)}>
                {damageOptions.map((option) => <option key={option} value={option}>{damageStateLabel(option, locale)}</option>)}
              </Select>
            </Field>
            <Field label={copy.ownerCount}>
              <Input value={state.ownerCount} onChange={(event) => update("ownerCount", event.target.value)} placeholder="1" inputMode="numeric" />
            </Field>
          </div>
          <p className="text-xs font-semibold leading-5 text-oto-muted">{copy.damageDisclaimer}</p>
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-oto-muted">{copy.description}</label>
              <span className="rounded-full bg-oto-surface px-3 py-1 text-xs font-black text-oto-muted">{copy.aiDescriptionSoon}</span>
            </div>
            <Textarea
              value={state.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder={copy.descriptionPlaceholder}
            />
            <div className="grid gap-1 text-xs font-semibold text-oto-muted sm:grid-cols-2">
              {copy.descriptionPrompts.map((prompt) => <span key={prompt}>{prompt}</span>)}
            </div>
          </div>
        </Panel>
      ) : null}

      {step === 4 ? (
        <Panel title={copy.photos}>
          {existingMedia.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {existingMedia.map((media) => (
                <div key={media.id} className="overflow-hidden rounded-oto border border-oto-border bg-white">
                  <div className="aspect-[4/3]"><SafeImage src={media.thumb_url || media.card_url || media.url} alt={sell03.existingPhotoAlt} /></div>
                  <p className="p-3 text-xs font-bold text-oto-muted">{media.is_cover ? sell03.existingCoverPhoto : sell03.existingPhoto}</p>
                </div>
              ))}
            </div>
          ) : null}
          {mode === "create" ? <div className="rounded-oto border border-oto-border bg-oto-surface p-4">
            <h3 className="text-sm font-black text-oto-text">{copy.photoGuide}</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {copy.photoChecklist.map((item) => (
                <div key={item} className="rounded-md bg-white px-3 py-2 text-xs font-bold text-oto-muted">{item}</div>
              ))}
            </div>
          </div> : null}
          {mode === "create" ? <label className="grid cursor-pointer gap-2 rounded-oto border border-dashed border-oto-border bg-white p-5 text-center">
            <span className="text-base font-black text-oto-text">{copy.addPhoto}</span>
            <span className="text-sm font-semibold leading-6 text-oto-muted">
              {copy.photoRequirements}
            </span>
            <Input className="mx-auto max-w-md" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => handlePhotoSelect(event.target.files)} />
          </label> : null}
          {mode === "editRejected" ? (
            <p className="rounded-md bg-oto-surface p-3 text-sm font-semibold text-oto-muted">{sell03.mediaPreserved}</p>
          ) : (
            <p className="text-sm text-oto-muted">{copy.photoCount(state.photos.length, maxPhotos)}</p>
          )}
          {mode === "create" && state.photos.length > 0 && state.photos.length < 3 ? (
            <p className="rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-700">{copy.minimumPhotosHelp}</p>
          ) : null}
          {mode === "create" && state.photos.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {state.photos.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-oto border border-oto-border bg-white">
                  <div className="aspect-[4/3]">
                    <SafeImage src={photo.previewUrl} alt={copy.listingPhotoAlt} />
                  </div>
                  <div className="grid gap-2 p-3">
                    <span className="text-xs font-bold text-oto-muted">{photo.isCover ? copy.coverPhoto : photo.file.name}</span>
                    <span className={photo.processingStatus === "failed" || photo.uploadStatus === "failed" ? "rounded-full bg-red-50 px-3 py-1 text-xs font-black text-oto-danger" : "rounded-full bg-oto-surface px-3 py-1 text-xs font-black text-oto-muted"}>
                      {photo.statusText}
                    </span>
                    {photo.prepared ? (
                      <span className="text-xs font-semibold text-oto-muted">
                        {copy.variantLabels.large} {Math.round(photo.prepared.variants.large.sizeBytes / 1024)} KB · {copy.variantLabels.card} {Math.round(photo.prepared.variants.card.sizeBytes / 1024)} KB · {copy.variantLabels.thumb} {Math.round(photo.prepared.variants.thumb.sizeBytes / 1024)} KB
                      </span>
                    ) : null}
                    {photo.error ? <span className="text-xs font-semibold leading-5 text-oto-danger">{photo.error}</span> : null}
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" variant="secondary" onClick={() => setCover(photo.id)} disabled={photo.isCover}>{copy.makeCover}</Button>
                      <Button type="button" variant="ghost" onClick={() => removePhoto(photo.id)}>{copy.remove}</Button>
                      {photo.processingStatus === "failed" ? (
                        <Button type="button" variant="secondary" onClick={() => retryPhotoProcessing(photo)}>{copy.tryAgain}</Button>
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
        <Panel title={copy.priceAndLocation}>
          <div className="rounded-oto border border-oto-border bg-oto-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-oto-text">{copy.fillFromPlate}</h3>
                <p className="mt-1 text-sm font-semibold text-oto-muted">{copy.automaticFillSoon}</p>
              </div>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-oto-muted">{copy.comingSoon}</span>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label={copy.price}>
              <Input value={state.priceAmount} onChange={(event) => update("priceAmount", event.target.value)} placeholder="1250000" inputMode="numeric" />
            </Field>
            <Field label={copy.currency}>
              <Select value={state.currency} onChange={(event) => update("currency", event.target.value)}>
                <option value="TRY">TRY</option>
              </Select>
            </Field>
            <Field label={copy.city}>
              <Select value={state.city} onChange={(event) => update("city", event.target.value)}>
                <option value="">{copy.selectCity}</option>
                {cityOptions.map((city) => <option key={city} value={city}>{cityLabel(city, locale)}</option>)}
              </Select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-oto-muted">
            <input type="checkbox" checked={state.priceNegotiable} onChange={(event) => update("priceNegotiable", event.target.checked)} />
            {copy.negotiable}
          </label>
          <PriceSuggestionCard suggestion={priceSuggestion} currency={state.currency} locale={locale} copy={copy} />
        </Panel>
      ) : null}

      {step === 6 ? (
        <Panel title={copy.previewAndPublish}>
          <div className="overflow-hidden rounded-oto border border-oto-border bg-white">
            <div className="aspect-[4/3] bg-oto-surface">
              <SafeImage src={(mode === "create" ? state.photos.find((photo) => photo.isCover)?.previewUrl : null) || existingMedia.find((media) => media.is_cover)?.url || existingMedia[0]?.url} alt={displayTitle || copy.listingPreviewAlt} />
            </div>
            <div className="grid gap-3 p-4">
              <h2 className="text-xl font-black text-oto-text" data-title-generated={mode === "editRejected" ? existingTitleGenerated : true}>{displayTitle || copy.listingTitleFallback}</h2>
              <p className="text-2xl font-black text-oto-text">{formatPrice(Number(state.priceAmount || 0), state.currency, locale)}</p>
              <p className="text-sm font-semibold text-oto-muted">
                {cityLabel(state.city, locale)} · {formatMileage(Number(state.mileageKm || 0), locale)} · {fuelLabel(state.fuelType, locale)} · {transmissionLabel(state.transmission, locale)} · {sellerTypeLabel(profile?.sellerType ?? state.sellerType, locale)}
              </p>
              <QualityScore score={displayQualityScore ?? 0} items={qualityItems} copy={copy} />
              <p className="text-sm leading-6 text-oto-muted">{state.description || copy.noSellerDescription}</p>
            </div>
          </div>
          {mode === "create" ? <label className="flex items-start gap-3 rounded-oto border border-oto-border bg-oto-surface p-4 text-sm font-semibold leading-6 text-oto-muted">
            <input className="mt-1" type="checkbox" checked={rulesAccepted} onChange={(event) => setRulesAccepted(event.target.checked)} />
            <span>
              {copy.agreementPrefix}{" "}
              <Link href={localizePath("/terms", locale)} className="font-black text-oto-blue">{copy.terms}</Link>
              {" "}{copy.agreementMiddle}{" "}
              <Link href={localizePath("/listing-rules", locale)} className="font-black text-oto-blue">{copy.listingRules}</Link>
              {" "}{copy.agreementSuffix}
            </span>
          </label> : null}
          {editSaved === "rejected" ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{sell03.saveSuccess}</p> : null}
          {editSaved === "pending_review" ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{sell03.resubmitSuccess}</p> : null}
          {error ? <ErrorState message={error} /> : null}
          {publishStatus ? <p className="rounded-md bg-oto-surface p-3 text-sm font-bold text-oto-muted">{publishStatus}</p> : null}
          {mode === "create" ? (
            <Button type="submit" variant="orange" disabled={submitting}>
              {submitting ? copy.publishing : copy.publish}
            </Button>
          ) : (
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" disabled={submitting || editSaved === "pending_review" || !isCurrentEditTarget(editListingId, loadedEditListingId, routeKey, loadedRouteKey)} onClick={() => void saveRejected(false)}>
                {submitting ? sell03.savingButton : sell03.saveButton}
              </Button>
              <Button type="button" variant="orange" disabled={submitting || editSaved === "pending_review" || !isCurrentEditTarget(editListingId, loadedEditListingId, routeKey, loadedRouteKey)} onClick={() => void saveRejected(true)}>
                {submitting ? sell03.resubmittingButton : sell03.resubmitButton}
              </Button>
            </div>
          )}
        </Panel>
      ) : null}

      {error && step !== 6 ? <ErrorState message={error} /> : null}

      <div className="flex justify-between gap-3">
        <Button type="button" variant="secondary" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1 || submitting}>{copy.back}</Button>
        {step < steps.length ? (
          <Button type="button" onClick={goNext}>{copy.next}</Button>
        ) : null}
      </div>
    </form>
  );
}

function ProfileFields({
  profile,
  cities,
  onChange,
  locale,
  copy
}: {
  profile: SellerProfileState;
  cities: string[];
  onChange: <K extends keyof SellerProfileState>(key: K, value: SellerProfileState[K]) => void;
  locale: "tr" | "en";
  copy: SellCopy;
}) {
  const isDealer = profile.sellerType === "dealer";

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Field label={copy.sellerType}>
        <Select value={profile.sellerType} onChange={(event) => onChange("sellerType", event.target.value)}>
          <option value="private">{sellerTypeLabel("private", locale)}</option>
          <option value="dealer">{sellerTypeLabel("dealer", locale)}</option>
        </Select>
      </Field>
      <Field label={copy.phone}>
        <Input value={profile.phone} onChange={(event) => onChange("phone", event.target.value)} placeholder="+..." />
      </Field>
      <Field label={isDealer ? copy.authorizedPersonName : copy.yourName}>
        <Input value={profile.fullName} onChange={(event) => onChange("fullName", event.target.value)} placeholder={isDealer ? copy.authorizedPersonName : copy.yourName} />
      </Field>
      <Field label={isDealer ? copy.dealerName : copy.displayName}>
        <Input value={profile.displayName} onChange={(event) => onChange("displayName", event.target.value)} placeholder={isDealer ? copy.dealerName : copy.displayName} />
      </Field>
      <Field label={copy.city}>
        <Select value={profile.city} onChange={(event) => onChange("city", event.target.value)}>
          <option value="">{copy.selectCity}</option>
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
  locale,
  copy
}: {
  suggestion: ReturnType<typeof getPriceSuggestion>;
  currency: string;
  locale: "tr" | "en";
  copy: SellCopy;
}) {
  return (
    <div className="rounded-oto border border-oto-border bg-oto-surface p-4">
      <h3 className="text-base font-black text-oto-text">{copy.estimatedMarketPrice}</h3>
      {suggestion ? (
        <div className="mt-3 grid gap-2 text-sm font-semibold text-oto-muted">
          <p>{copy.similarListingRange}: {formatPrice(suggestion.minPrice, currency, locale)} - {formatPrice(suggestion.maxPrice, currency, locale)}</p>
          <p>{copy.fasterSalePrice}: {formatPrice(suggestion.averagePrice, currency, locale)}</p>
          <p className="text-xs">{copy.comparableBasis(suggestion.comparableCount)}</p>
        </div>
      ) : (
        <p className="mt-3 text-sm font-semibold leading-6 text-oto-muted">
          {copy.noPriceSuggestion}
        </p>
      )}
    </div>
  );
}

function QualityScore({ score, items, copy }: { score: number; items: QualityItem[]; copy: SellCopy }) {
  return (
    <div className="rounded-oto bg-oto-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black text-oto-text">{copy.quality}: {score}%</p>
        <span className="text-xs font-bold text-oto-muted">{score >= 80 ? copy.qualityVeryGood : score >= 55 ? copy.qualityGood : copy.qualityIncomplete}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-oto-blue" style={{ width: `${score}%` }} />
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <span key={item.label} className={item.complete ? "rounded-md bg-white px-3 py-2 text-xs font-bold text-oto-success" : "rounded-md bg-white px-3 py-2 text-xs font-bold text-oto-muted"}>
            {item.complete ? copy.complete : copy.incomplete} · {item.label}
          </span>
        ))}
      </div>
      <p className="mt-3 text-sm leading-6 text-oto-muted">
        {copy.qualityDisclaimer}
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

function SuccessState({ onCreateNew, copy, locale }: { onCreateNew: () => void; copy: SellCopy; locale: "tr" | "en" }) {
  return (
    <Panel title={copy.successTitle}>
      <p className="text-sm leading-6 text-oto-muted">
        {copy.successBody}
      </p>
      <div className="grid gap-3 rounded-oto border border-oto-border bg-oto-surface p-4 sm:grid-cols-2">
        <ButtonLink href={localizePath("/my-listings", locale)}>{copy.viewListing}</ButtonLink>
        <ButtonLink href={localizePath("/my-listings", locale)} variant="secondary">{copy.myListings}</ButtonLink>
        <ButtonLink href={localizePath("/", locale)} variant="secondary">{copy.backHome}</ButtonLink>
        <Button type="button" variant="orange" onClick={onCreateNew}>{copy.createNew}</Button>
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

function getQualityItems(state: WizardState, profileComplete: boolean, copy: SellCopy): QualityItem[] {
  return [
    { label: copy.qualityItems[0], complete: profileComplete },
    { label: copy.qualityItems[1], complete: Boolean(state.makeId && state.modelId && state.year && validYear(state.year)) },
    { label: copy.qualityItems[2], complete: Number(state.priceAmount) > 0 },
    { label: copy.qualityItems[3], complete: Boolean(state.city) },
    { label: copy.qualityItems[4], complete: state.description.trim().length >= 60 },
    { label: copy.qualityItems[5], complete: state.photos.length >= 3 },
    { label: copy.qualityItems[6], complete: state.photos.some((photo) => photo.isCover) },
    { label: copy.qualityItems[7], complete: Boolean(state.damageState && state.damageState !== "unknown") }
  ];
}

function validateSellerProfile(profile: SellerProfileState, copy: SellCopy) {
  if (!profile.sellerType) return copy.selectSellerType;
  if (!profile.phone.trim()) return copy.missingPhone;
  if (!profile.city) return copy.requiredCity;
  if (!profile.fullName.trim()) return profile.sellerType === "dealer" ? copy.enterAuthorizedPerson : copy.enterYourName;
  if (!profile.displayName.trim()) return profile.sellerType === "dealer" ? copy.enterDealerName : copy.enterDisplayName;
  return null;
}

function validateStep(step: number, state: WizardState, copy: SellCopy) {
  if (step === 2) {
    if (!state.makeId || !state.modelId || !state.year) return copy.requiredVehicleIdentity;
    if (!validYear(state.year)) return copy.invalidYear;
  }
  if (step === 3) {
    if (state.condition === "used" && !state.mileageKm) return copy.usedMileageRequired;
    if (state.mileageKm && Number(state.mileageKm) < 0) return copy.invalidMileage;
    if (state.fuelType !== "electric" && (!state.engineVolumeL || !Number.isFinite(Number(state.engineVolumeL)) || Number(state.engineVolumeL) <= 0)) {
      return copy.combustionDisplacement;
    }
    if (state.fuelType === "electric" && state.engineVolumeL) {
      return copy.electricDisplacement;
    }
  }
  if (step === 5) {
    if (Number(state.priceAmount) <= 0) return copy.invalidPrice;
    if (!state.city) return copy.requiredCity;
  }
  return null;
}

function validateForPublish(state: WizardState, copy: SellCopy) {
  const unsignedInteger = /^(0|[1-9][0-9]*)$/;
  const priceValid = /^[1-9][0-9]*$/.test(state.priceAmount)
    && BigInt(state.priceAmount) <= 9223372036854775807n;
  const mileageValid = unsignedInteger.test(state.mileageKm)
    && BigInt(state.mileageKm) <= 2147483647n;
  const ownerCountValid = state.ownerCount === ""
    || (/^[1-9][0-9]*$/.test(state.ownerCount) && BigInt(state.ownerCount) <= 32767n);
  const engineValid = state.fuelType === "electric"
    ? state.engineVolumeL === ""
    : /^(?:[0-9]{1,3})(?:\.[0-9])?$/.test(state.engineVolumeL)
      && Number(state.engineVolumeL) > 0
      && Number(state.engineVolumeL) <= 999.9;
  if (!validYear(state.year) || !mileageValid || !priceValid || !ownerCountValid || !engineValid) {
    return copy.invalidVehicleFields;
  }
  return validateStep(2, state, copy) || validateStep(3, state, copy) || validateStep(5, state, copy);
}

function editErrorMessage(error: unknown, sell03: SellCopy, resubmit = false) {
  const code = error && typeof error === "object" && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  if (code === "OT409") return sell03.staleConflict;
  if (code === "OT422") return sell03.invalidVehicleFields;
  if (code === "OT401") return sell03.authenticationRequired;
  return resubmit ? sell03.resubmitFailure : sell03.listingUnavailable;
}

function validYear(value: string) {
  if (!/^[0-9]{4}$/.test(value)) return false;
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
  isCurrent,
  copy,
  onStatus
}: {
  supabase: ReturnType<typeof getSupabaseBrowserClient>;
  userId: string;
  vehicleProfileId: string;
  photo: PhotoItem;
  sortOrder: number;
  isCurrent: () => boolean;
  copy: SellCopy;
  onStatus: (statusText: string) => void;
}) {
  const mediaId = crypto.randomUUID();
  const uploads: Partial<Record<PreparedImageVariantName, { path: string; url: string }>> = {};
  const variants = getUploadVariants(photo);

  for (const item of variants) {
    if (!isCurrent()) return null;
    onStatus(getVariantUploadStatus(copy, item.name));
    const path = `${userId}/${vehicleProfileId}/${mediaId}/${item.name}/${item.name}.${item.extension}`;
    const { error } = await supabase.storage.from("listing-media").upload(path, item.file, {
      cacheControl: "31536000",
      upsert: false,
      contentType: item.mimeType
    });

    if (!isCurrent()) return null;
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
