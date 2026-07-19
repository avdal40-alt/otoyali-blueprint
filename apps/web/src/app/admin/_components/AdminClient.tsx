"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/layout/AppHeader";
import { MarketplaceFooter } from "@/components/layout/MarketplaceFooter";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/States";
import { useI18n } from "@/i18n/client";
import { localizePath } from "@/i18n/config";
import { t } from "@/i18n/get-dictionary";
import type { ClientDictionary, Locale } from "@/i18n/types";
import { SafeImage } from "@/components/ui/SafeImage";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { isMissingAuthSessionError } from "@/lib/auth/auth-ui";
import { formatPrice } from "@/lib/format";
import { getBestImageUrl, isImageProcessingFailed } from "@/lib/media/image-variants";
import type { ServiceProviderApplicationAdminRow } from "@/lib/supabase/types";

type AdminSection = "dashboard" | "listings" | "videos" | "services" | "reports" | "users" | "settings";

type AdminState = {
  status: "loading" | "login" | "denied" | "ready" | "error";
  userId: string | null;
  role: string | null;
  error: string | null;
};

type ListingRow = {
  id: string;
  vehicle_profile_id: string | null;
  seller_id: string | null;
  title: string | null;
  status: string | null;
  moderation_status: string | null;
  price_amount: number | null;
  currency: string | null;
  city: string | null;
  seller_type: string | null;
  quality_score: number | null;
  published_at: string | null;
  created_at: string | null;
};

type VehicleProfileRow = {
  id: string;
  make_id: string | null;
  model_id: string | null;
  year: number | null;
};

type CatalogRow = {
  id: string;
  name: string | null;
};

type MediaPreviewRow = {
  vehicle_profile_id: string;
  url: string | null;
  thumb_url?: string | null;
  card_url?: string | null;
  large_url?: string | null;
  processed_status?: string | null;
};

type VideoRow = {
  id: string;
  listing_id: string | null;
  seller_user_id: string | null;
  title: string | null;
  status: string | null;
  moderation_status: string | null;
  processing_status: string | null;
  visibility: string | null;
  poster_url: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  created_at: string | null;
};

type ReportRow = {
  id: string;
  reporter_user_id: string | null;
  listing_id: string | null;
  video_id: string | null;
  reported_user_id: string | null;
  reason: string | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
  resolution_note: string | null;
};

type ProfileRow = {
  id: string;
  display_name: string | null;
  full_name: string | null;
  seller_type: string | null;
  city: string | null;
  created_at: string | null;
};

type AuditRow = {
  id: string;
  actor_user_id: string | null;
  action: string | null;
  entity_type: string | null;
  entity_id: string | null;
  created_at: string | null;
};

type ServiceApplicationReviewResponse = {
  data?: {
    application_id?: string | null;
    status?: string | null;
    reviewed_at?: string | null;
  } | null;
  error?: string;
};

const navItems: Array<{ section: AdminSection; href: string; label: string }> = [
  { section: "dashboard", href: "/admin", label: "Dashboard" },
  { section: "listings", href: "/admin/listings", label: "İlanlar" },
  { section: "videos", href: "/admin/videos", label: "Videolar" },
  { section: "services", href: "/admin/services", label: "Servisler" },
  { section: "reports", href: "/admin/reports", label: "Şikayetler" },
  { section: "users", href: "/admin/users", label: "Kullanıcılar" },
  { section: "settings", href: "/admin/settings", label: "Ayarlar" }
];

export function AdminClient({ section }: { section: AdminSection }) {
  const { locale, dictionary } = useI18n();
  const [admin, setAdmin] = useState<AdminState>({ status: "loading", userId: null, role: null, error: null });

  useEffect(() => {
    async function checkAdmin() {
      if (!hasSupabaseEnv()) {
        setAdmin({ status: "error", userId: null, role: null, error: "Supabase ortam değişkenleri eksik." });
        return;
      }

      const supabase = getSupabaseBrowserClient();
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError && !isMissingAuthSessionError(userError.message)) {
        setAdmin({ status: "error", userId: null, role: null, error: userError.message });
        return;
      }

      if (!userData.user) {
        setAdmin({ status: "login", userId: null, role: null, error: null });
        return;
      }

      const [{ data: isAdmin }, { data: role }] = await Promise.all([
        supabase.rpc("is_admin", { uid: userData.user.id }),
        supabase.rpc("admin_role", { uid: userData.user.id })
      ]);

      if (!isAdmin) {
        setAdmin({ status: "denied", userId: userData.user.id, role: null, error: null });
        return;
      }

      setAdmin({ status: "ready", userId: userData.user.id, role: typeof role === "string" ? role : "moderator", error: null });
    }

    void checkAdmin();
  }, []);

  return (
    <>
      <AppHeader />
      <PageContainer className="pb-28">
        <div className="mb-5 rounded-oto border border-oto-border bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-oto-blue">OTOYALI Admin</p>
              <h1 className="mt-1 text-2xl font-black text-oto-text">{adminNavLabel(section, dictionary)}</h1>
            </div>
            {admin.role ? <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-black text-oto-blue">{admin.role}</span> : null}
          </div>
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={localizePath(item.href, locale)}
                className={item.section === section ? "rounded-full bg-oto-text px-3 py-2 text-xs font-black text-white" : "rounded-full bg-oto-surface px-3 py-2 text-xs font-black text-oto-muted"}
              >
                {adminNavLabel(item.section, dictionary)}
              </Link>
            ))}
          </nav>
        </div>

        {admin.status === "loading" ? <LoadingState /> : null}
        {admin.status === "login" ? (
          <EmptyState
            title={String(dictionary.admin.accessRequiredTitle)}
            body={String(dictionary.admin.accessRequiredBody)}
            href={`${localizePath("/login", locale)}?next=${encodeURIComponent(localizePath("/admin", locale))}`}
            action={String(dictionary.admin.login)}
          />
        ) : null}
        {admin.status === "denied" ? (
          <ErrorState message="Bu alana erişim yetkiniz yok." />
        ) : null}
        {admin.status === "error" ? <ErrorState message={admin.error ?? "Admin kontrolü tamamlanamadı."} /> : null}
        {admin.status === "ready" && admin.userId ? <AdminSectionContent section={section} userId={admin.userId} role={admin.role ?? "moderator"} locale={locale} /> : null}
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}

function AdminSectionContent({ section, userId, role, locale }: { section: AdminSection; userId: string; role: string; locale: Locale }) {
  if (section === "dashboard") return <Dashboard userId={userId} />;
  if (section === "listings") return <ListingsModeration userId={userId} locale={locale} />;
  if (section === "videos") return <VideosModeration userId={userId} />;
  if (section === "services") return <ServiceApplicationsModeration locale={locale} />;
  if (section === "reports") return <ReportsModeration userId={userId} />;
  if (section === "users") return <UsersOverview />;
  return <AdminSettings role={role} />;
}

function Dashboard({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<Array<{ label: string; value: number | string }>>([]);
  const [auditLogs, setAuditLogs] = useState<AuditRow[]>([]);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient();
      const [
        totalListings,
        pendingListings,
        activeListings,
        rejectedListings,
        pendingVideos,
        openReports,
        profiles,
        logs
      ] = await Promise.all([
        countRows(supabase.schema("marketplace").from("listings").select("id", { count: "exact", head: true })),
        countRows(supabase.schema("marketplace").from("listings").select("id", { count: "exact", head: true }).eq("moderation_status", "pending_review")),
        countRows(supabase.schema("marketplace").from("listings").select("id", { count: "exact", head: true }).eq("status", "active").eq("moderation_status", "active")),
        countRows(supabase.schema("marketplace").from("listings").select("id", { count: "exact", head: true }).eq("moderation_status", "rejected")),
        countRows(supabase.schema("marketplace").from("listing_videos").select("id", { count: "exact", head: true }).eq("moderation_status", "pending_review")),
        countRows(supabase.schema("marketplace").from("reports").select("id", { count: "exact", head: true }).eq("status", "open")),
        countRows(supabase.from("profiles").select("id", { count: "exact", head: true })),
        supabase.from("admin_audit_logs").select("id,actor_user_id,action,entity_type,entity_id,created_at").order("created_at", { ascending: false }).limit(8)
      ]);

      if (logs.error) {
        setError(logs.error.message);
      }

      setCards([
        { label: "Toplam ilan", value: totalListings },
        { label: "Onay bekleyen ilanlar", value: pendingListings },
        { label: "Aktif ilanlar", value: activeListings },
        { label: "Reddedilen ilanlar", value: rejectedListings },
        { label: "Video bekleyenler", value: pendingVideos },
        { label: "Açık şikayetler", value: openReports },
        { label: "Toplam kullanıcı/satıcı", value: profiles }
      ]);
      setAuditLogs((logs.data ?? []) as AuditRow[]);
      setLoading(false);
    }

    void load();
  }, [userId]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="grid gap-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-oto border border-oto-border bg-white p-4 shadow-soft">
            <p className="text-xs font-black uppercase tracking-wide text-oto-muted">{card.label}</p>
            <p className="mt-2 text-3xl font-black text-oto-text">{card.value}</p>
          </div>
        ))}
      </div>
      <AuditLogList logs={auditLogs} />
    </div>
  );
}

function ListingsModeration({ userId, locale }: { userId: string; locale: Locale }) {
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, VehicleProfileRow>>({});
  const [makes, setMakes] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});
  const [mediaPreviews, setMediaPreviews] = useState<Record<string, MediaPreviewRow>>({});
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async function load() {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    let query = supabase
      .schema("marketplace")
      .from("listings")
      .select("id,vehicle_profile_id,seller_id,title,status,moderation_status,price_amount,currency,city,seller_type,quality_score,published_at,created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== "all") {
      query = query.eq("moderation_status", filter);
    }

    const { data, error: listingError } = await query;
    if (listingError) {
      setError(listingError.message);
      setLoading(false);
      return;
    }

    const listings = (data ?? []) as ListingRow[];
    const profileIds = listings.map((item) => item.vehicle_profile_id).filter(Boolean) as string[];
    const profileResult = profileIds.length > 0
      ? await supabase.schema("vehicle").from("vehicle_profiles").select("id,make_id,model_id,year").in("id", profileIds)
      : { data: [], error: null };
    const profileRows = (profileResult.data ?? []) as VehicleProfileRow[];
    const makeIds = Array.from(new Set(profileRows.map((item) => item.make_id).filter(Boolean))) as string[];
    const modelIds = Array.from(new Set(profileRows.map((item) => item.model_id).filter(Boolean))) as string[];
    const [makeResult, modelResult, mediaResult] = await Promise.all([
      makeIds.length > 0 ? supabase.schema("vehicle").from("makes").select("id,name").in("id", makeIds) : Promise.resolve({ data: [], error: null }),
      modelIds.length > 0 ? supabase.schema("vehicle").from("models").select("id,name").in("id", modelIds) : Promise.resolve({ data: [], error: null }),
      profileIds.length > 0
        ? supabase
          .schema("vehicle")
          .from("profile_media")
          .select("vehicle_profile_id,url,thumb_url,card_url,large_url,processed_status,is_cover,sort_order")
          .in("vehicle_profile_id", profileIds)
          .order("is_cover", { ascending: false })
          .order("sort_order", { ascending: true })
        : Promise.resolve({ data: [], error: null })
    ]);

    setRows(listings);
    setProfiles(Object.fromEntries(profileRows.map((item) => [item.id, item])));
    setMakes(Object.fromEntries(((makeResult.data ?? []) as CatalogRow[]).map((item) => [item.id, item.name ?? ""])));
    setModels(Object.fromEntries(((modelResult.data ?? []) as CatalogRow[]).map((item) => [item.id, item.name ?? ""])));
    const previews = new Map<string, MediaPreviewRow>();
    for (const item of (mediaResult.data ?? []) as MediaPreviewRow[]) {
      if (!previews.has(item.vehicle_profile_id)) {
        previews.set(item.vehicle_profile_id, item);
      }
    }
    setMediaPreviews(Object.fromEntries(previews));
    setError(profileResult.error?.message ?? makeResult.error?.message ?? modelResult.error?.message ?? mediaResult.error?.message ?? null);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(listing: ListingRow, action: "approve" | "reject" | "archive" | "pending") {
    const note = action === "approve" ? null : window.prompt("Kısa not / gerekçe")?.trim() ?? null;
    if ((action === "reject" || action === "archive") && !note) return;
    const supabase = getSupabaseBrowserClient();
    const now = new Date().toISOString();
    const patch =
      action === "approve"
        ? { status: "active", moderation_status: "active", moderation_note: null, rejection_reason: null, archived_at: null, moderated_by: userId, moderated_at: now }
        : action === "reject"
          ? { status: "removed", moderation_status: "rejected", moderation_note: note, rejection_reason: note, moderated_by: userId, moderated_at: now }
          : action === "archive"
            ? { status: "removed", moderation_status: "archived", moderation_note: note, archived_at: now, moderated_by: userId, moderated_at: now }
            : { status: "paused", moderation_status: "pending_review", moderation_note: note, moderated_by: userId, moderated_at: now };

    const { error: updateError } = await supabase.schema("marketplace").from("listings").update(patch).eq("id", listing.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await logAdminAction(userId, `${action}_listing`, "listing", listing.id, { note, previous_status: listing.status, previous_moderation_status: listing.moderation_status });
    await load();
  }

  return (
    <AdminTableShell
      title="İlan moderasyonu"
      filter={
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-md border border-oto-border bg-white px-3 text-sm font-bold">
          <option value="all">Tümü</option>
          <option value="pending_review">Onay bekleyen</option>
          <option value="active">Onaylandı</option>
          <option value="rejected">Reddedildi</option>
          <option value="archived">Arşivlendi</option>
        </select>
      }
      loading={loading}
      error={error}
      empty={rows.length === 0}
    >
      {rows.map((row) => {
        const profile = row.vehicle_profile_id ? profiles[row.vehicle_profile_id] : null;
        const mediaPreview = row.vehicle_profile_id ? mediaPreviews[row.vehicle_profile_id] : null;
        const makeModel = [profile?.make_id ? makes[profile.make_id] : null, profile?.model_id ? models[profile.model_id] : null, profile?.year].filter(Boolean).join(" ");
        return (
          <div key={row.id} className="grid gap-3 border-b border-oto-border py-4 last:border-b-0 lg:grid-cols-[88px_1.3fr_1fr_0.9fr_1.4fr] lg:items-center">
            <div className="aspect-[4/3] overflow-hidden rounded-md bg-oto-surface">
              <SafeImage src={getBestImageUrl(mediaPreview, "thumb")} alt={row.title || "İlan"} />
            </div>
            <div>
              <p className="font-black text-oto-text">{row.title || "İlan"}</p>
              <div className="mt-1">
                <Badge variant="primary">{t(locale, "verticals.cars.shortLabel")}</Badge>
              </div>
              <p className="mt-1 text-xs font-bold text-oto-muted">{makeModel || row.vehicle_profile_id || "Araç bilgisi yok"}</p>
              {mediaPreview?.processed_status ? (
                <p className={isImageProcessingFailed(mediaPreview) ? "mt-1 text-xs font-black text-oto-danger" : "mt-1 text-xs font-bold text-oto-muted"}>
                  Görsel: {mediaPreview.processed_status}
                </p>
              ) : null}
            </div>
            <div className="text-sm font-bold text-oto-muted">
              <p>{row.city || "Şehir yok"} · {row.seller_type || "seller"}</p>
              <p>{formatPrice(row.price_amount, row.currency, locale)} · Kalite {row.quality_score ?? 0}</p>
            </div>
            <div className="text-xs font-black text-oto-muted">
              <p>Status: {row.status}</p>
              <p>Moderasyon: {moderationLabel(row.moderation_status)}</p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <SmallButton onClick={() => moderate(row, "approve")}>Onayla</SmallButton>
              <SmallButton onClick={() => moderate(row, "reject")} variant="secondary">Reddet</SmallButton>
              <SmallButton onClick={() => moderate(row, "archive")} variant="secondary">Arşivle</SmallButton>
              <Link href={localizePath(`/listing/${row.id}`, locale)} className="rounded-md border border-oto-border px-3 py-2 text-xs font-black text-oto-text">Aç</Link>
            </div>
          </div>
        );
      })}
    </AdminTableShell>
  );
}

function VideosModeration({ userId }: { userId: string }) {
  const [rows, setRows] = useState<VideoRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async function load() {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    let query = supabase
      .schema("marketplace")
      .from("listing_videos")
      .select("id,listing_id,seller_user_id,title,status,moderation_status,processing_status,visibility,poster_url,thumbnail_url,video_url,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (filter !== "all") query = query.eq("moderation_status", filter);
    const { data, error: videoError } = await query;
    setRows((data ?? []) as VideoRow[]);
    setError(videoError?.message ?? null);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(video: VideoRow, action: "approve" | "reject" | "archive") {
    const note = action === "approve" ? null : window.prompt("Kısa not / gerekçe")?.trim() ?? null;
    if ((action === "reject" || action === "archive") && !note) return;
    const supabase = getSupabaseBrowserClient();
    const now = new Date().toISOString();
    const patch =
      action === "approve"
        ? { status: "active", visibility: "public", moderation_status: "approved", moderation_note: null, rejection_reason: null, moderated_by: userId, moderated_at: now }
        : action === "reject"
          ? { status: "rejected", moderation_status: "rejected", moderation_note: note, rejection_reason: note, moderated_by: userId, moderated_at: now }
          : { status: "archived", moderation_status: "archived", moderation_note: note, moderated_by: userId, moderated_at: now };
    const { error: updateError } = await supabase.schema("marketplace").from("listing_videos").update(patch).eq("id", video.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await logAdminAction(userId, `${action}_video`, "video", video.id, { note, previous_status: video.status, previous_moderation_status: video.moderation_status });
    await load();
  }

  return (
    <AdminTableShell
      title="Video moderasyonu"
      filter={
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-md border border-oto-border bg-white px-3 text-sm font-bold">
          <option value="all">Tümü</option>
          <option value="pending_review">Onay bekleyen</option>
          <option value="approved">Onaylandı</option>
          <option value="rejected">Reddedildi</option>
          <option value="archived">Arşivlendi</option>
        </select>
      }
      loading={loading}
      error={error}
      empty={rows.length === 0}
    >
      {rows.map((row) => (
        <div key={row.id} className="grid gap-3 border-b border-oto-border py-4 last:border-b-0 lg:grid-cols-[80px_1.2fr_1fr_1.5fr] lg:items-center">
          <div className="aspect-[9/12] overflow-hidden rounded-md bg-oto-surface">
            {row.poster_url || row.thumbnail_url ? <SafeImage src={row.poster_url || row.thumbnail_url} alt="Video önizleme" /> : <div className="flex h-full items-center justify-center text-xs font-black text-oto-muted">Video</div>}
          </div>
          <div>
            <p className="font-black text-oto-text">{row.title || "Araç videosu"}</p>
            <p className="mt-1 text-xs font-bold text-oto-muted">{row.listing_id || "İlan bağlantısı yok"}</p>
          </div>
          <div className="text-xs font-black text-oto-muted">
            <p>Status: {row.status}</p>
            <p>Moderasyon: {row.moderation_status}</p>
            <p>İşleme: {row.processing_status}</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <SmallButton onClick={() => moderate(row, "approve")}>Onayla</SmallButton>
            <SmallButton onClick={() => moderate(row, "reject")} variant="secondary">Reddet</SmallButton>
            <SmallButton onClick={() => moderate(row, "archive")} variant="secondary">Arşivle</SmallButton>
            {row.listing_id ? <Link href={`/listing/${row.listing_id}`} className="rounded-md border border-oto-border px-3 py-2 text-xs font-black text-oto-text">İlan</Link> : null}
            <Link href={row.listing_id ? `/video?listing=${row.listing_id}` : "/video"} className="rounded-md border border-oto-border px-3 py-2 text-xs font-black text-oto-text">Önizle</Link>
          </div>
        </div>
      ))}
    </AdminTableShell>
  );
}

function ServiceApplicationsModeration({ locale }: { locale: Locale }) {
  const [rows, setRows] = useState<ServiceProviderApplicationAdminRow[]>([]);
  const [filter, setFilter] = useState("pending_review");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async function load() {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    let query = supabase
      .from("service_admin_provider_applications")
      .select("application_id,submitter_id,status,business_name,contact_person_name,contact_phone,city,district,category_keys,supported_verticals,website_url,notes,consent_accuracy,moderation_note,reviewed_by,reviewed_at,created_at,updated_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error: applicationError } = await query;
    setRows((data ?? []) as ServiceProviderApplicationAdminRow[]);
    setError(applicationError?.message ?? null);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateApplication(application: ServiceProviderApplicationAdminRow, status: "reviewing" | "approved" | "rejected" | "archived") {
    const defaultNote = status === "approved" ? t(locale, "services.admin.approvedNote") : "";
    const note = window.prompt("Kısa not", defaultNote)?.trim() ?? null;
    if ((status === "rejected" || status === "archived") && !note) return;
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) {
      setError(sessionError?.message ?? "Admin oturumu bulunamadı.");
      return;
    }

    let result: ServiceApplicationReviewResponse | null = null;
    const response = await fetch("/api/admin/service-applications/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        applicationId: application.application_id,
        decision: status,
        reviewNote: note
      })
    });

    try {
      result = (await response.json()) as ServiceApplicationReviewResponse;
    } catch {
      result = null;
    }

    if (!response.ok) {
      setError(result?.error ?? "Servis başvurusu güncellenemedi.");
      return;
    }

    await load();
  }

  return (
    <AdminTableShell
      title={t(locale, "services.admin.title")}
      filter={
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-md border border-oto-border bg-white px-3 text-sm font-bold">
          <option value="all">Tümü</option>
          <option value="pending_review">Onay bekleyen</option>
          <option value="reviewing">İnceleniyor</option>
          <option value="approved">Onaylandı</option>
          <option value="rejected">Reddedildi</option>
          <option value="archived">Arşivlendi</option>
        </select>
      }
      loading={loading}
      error={error}
      empty={rows.length === 0}
    >
      {rows.map((row) => (
        <div key={row.application_id} className="grid gap-3 border-b border-oto-border py-4 last:border-b-0 lg:grid-cols-[1.2fr_1fr_1fr_1.3fr] lg:items-center">
          <div>
            <p className="font-black text-oto-text">{row.business_name || "Servis başvurusu"}</p>
            <p className="mt-1 text-xs font-bold text-oto-muted">{row.contact_person_name || "-"} · {row.contact_phone || "-"}</p>
            {row.website_url ? <p className="mt-1 break-all text-xs font-bold text-oto-blue">{row.website_url}</p> : null}
          </div>
          <div className="text-xs font-bold text-oto-muted">
            <p>{[row.city, row.district].filter(Boolean).join(" / ") || "Konum yok"}</p>
            <p>{(row.supported_verticals ?? []).join(", ") || "Araç türü yok"}</p>
          </div>
          <div className="text-xs font-bold text-oto-muted">
            <p>{(row.category_keys ?? []).join(", ") || "Kategori yok"}</p>
            <p className="mt-1 font-black text-oto-text">{row.status || "pending_review"}</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <SmallButton onClick={() => updateApplication(row, "reviewing")}>{t(locale, "services.admin.review")}</SmallButton>
            <SmallButton onClick={() => updateApplication(row, "approved")} variant="secondary">{t(locale, "services.admin.approve")}</SmallButton>
            <SmallButton onClick={() => updateApplication(row, "rejected")} variant="secondary">{t(locale, "services.admin.reject")}</SmallButton>
            <SmallButton onClick={() => updateApplication(row, "archived")} variant="secondary">{t(locale, "services.admin.archive")}</SmallButton>
          </div>
        </div>
      ))}
    </AdminTableShell>
  );
}

function ReportsModeration({ userId }: { userId: string }) {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async function load() {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    let query = supabase
      .schema("marketplace")
      .from("reports")
      .select("id,reporter_user_id,listing_id,video_id,reported_user_id,reason,description,status,created_at,resolution_note")
      .order("created_at", { ascending: false })
      .limit(50);
    if (filter !== "all") query = query.eq("status", filter);
    const { data, error: reportError } = await query;
    setRows((data ?? []) as ReportRow[]);
    setError(reportError?.message ?? null);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateReport(report: ReportRow, status: "reviewing" | "resolved" | "dismissed") {
    const note = status === "reviewing" ? null : window.prompt("Çözüm notu")?.trim() ?? null;
    if ((status === "resolved" || status === "dismissed") && !note) return;
    const supabase = getSupabaseBrowserClient();
    const patch = {
      status,
      resolution_note: note,
      resolved_by: status === "reviewing" ? null : userId,
      resolved_at: status === "reviewing" ? null : new Date().toISOString()
    };
    const { error: updateError } = await supabase.schema("marketplace").from("reports").update(patch).eq("id", report.id);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    await logAdminAction(userId, `${status}_report`, "report", report.id, { note, previous_status: report.status });
    await load();
  }

  return (
    <AdminTableShell
      title="Şikayetler"
      filter={
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-md border border-oto-border bg-white px-3 text-sm font-bold">
          <option value="all">Tümü</option>
          <option value="open">Açık</option>
          <option value="reviewing">İnceleniyor</option>
          <option value="resolved">Çözüldü</option>
          <option value="dismissed">Kapatıldı</option>
        </select>
      }
      loading={loading}
      error={error}
      empty={rows.length === 0}
    >
      {rows.map((row) => (
        <div key={row.id} className="grid gap-3 border-b border-oto-border py-4 last:border-b-0 lg:grid-cols-[1fr_1.1fr_1fr_1.3fr] lg:items-center">
          <div>
            <p className="font-black text-oto-text">{reportReasonLabel(row.reason)}</p>
            <p className="mt-1 line-clamp-2 text-xs font-bold text-oto-muted">{row.description || "Açıklama yok"}</p>
          </div>
          <div className="text-xs font-bold text-oto-muted">
            <p>İlan: {row.listing_id || "-"}</p>
            <p>Video: {row.video_id || "-"}</p>
            <p>Kullanıcı: {row.reported_user_id || "-"}</p>
          </div>
          <div className="text-sm font-black text-oto-muted">{row.status}</div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <SmallButton onClick={() => updateReport(row, "reviewing")}>İncele</SmallButton>
            <SmallButton onClick={() => updateReport(row, "resolved")} variant="secondary">Çöz</SmallButton>
            <SmallButton onClick={() => updateReport(row, "dismissed")} variant="secondary">Kapat</SmallButton>
            {row.listing_id ? <Link href={`/listing/${row.listing_id}`} className="rounded-md border border-oto-border px-3 py-2 text-xs font-black text-oto-text">İlan</Link> : null}
          </div>
        </div>
      ))}
    </AdminTableShell>
  );
}

function UsersOverview() {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowserClient();
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id,display_name,full_name,seller_type,city,created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      setRows((data ?? []) as ProfileRow[]);
      setError(profileError?.message ?? null);
      setLoading(false);
    }

    void load();
  }, []);

  return (
    <AdminTableShell title="Kullanıcılar ve satıcılar" loading={loading} error={error} empty={rows.length === 0}>
      {rows.map((row) => (
        <div key={row.id} className="grid gap-2 border-b border-oto-border py-4 last:border-b-0 md:grid-cols-[1fr_1fr_1fr] md:items-center">
          <div>
            <p className="font-black text-oto-text">{row.display_name || row.full_name || "Kullanıcı"}</p>
            <p className="mt-1 text-xs font-bold text-oto-muted">{maskId(row.id)}</p>
          </div>
          <p className="text-sm font-bold text-oto-muted">{row.seller_type || "private"} · {row.city || "Şehir yok"}</p>
          <p className="text-sm font-bold text-oto-muted md:text-right">{formatDate(row.created_at)}</p>
        </div>
      ))}
    </AdminTableShell>
  );
}

function AdminSettings({ role }: { role: string }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <h2 className="text-lg font-black text-oto-text">Admin rolü</h2>
        <p className="mt-2 text-sm font-bold text-oto-muted">Mevcut rol: <span className="text-oto-text">{role}</span></p>
      </div>
      <div className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <h2 className="text-lg font-black text-oto-text">Bootstrap</h2>
        <p className="mt-2 text-sm leading-6 text-oto-muted">İlk admin kullanıcısı Supabase SQL editor veya service role ile eklenmelidir.</p>
        <pre className="mt-4 overflow-x-auto rounded-md bg-oto-text p-4 text-xs font-bold text-white">{`insert into public.admin_users (user_id, role, is_active)
values ('YOUR_AUTH_USER_ID', 'owner', true)
on conflict (user_id)
do update set role = excluded.role, is_active = excluded.is_active;`}</pre>
      </div>
      <div className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <h2 className="text-lg font-black text-oto-text">Politika bağlantıları</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/moderation-policy" className="rounded-md border border-oto-border px-3 py-2 text-sm font-black text-oto-text hover:border-oto-blue">
            Moderasyon Politikası
          </Link>
          <Link href="/listing-rules" className="rounded-md border border-oto-border px-3 py-2 text-sm font-black text-oto-text hover:border-oto-blue">
            İlan Kuralları
          </Link>
          <Link href="/trust" className="rounded-md border border-oto-border px-3 py-2 text-sm font-black text-oto-text hover:border-oto-blue">
            Güven Merkezi
          </Link>
        </div>
      </div>
      <div className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <h2 className="text-lg font-black text-oto-text">Notlar</h2>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-oto-muted">
          <p>Admin rolleri dikkatli yönetilmelidir. Normal kullanıcılar admin verisi okuyamaz.</p>
          <p>Şikayetler gizlidir ve herkese açık sayfalarda görünmez.</p>
          <p>Moderasyon aksiyonları public.admin_audit_logs içine yazılır.</p>
          <p>Performans ilkeleri için apps/web README içindeki Performance Guardrails bölümünü kullanın.</p>
        </div>
      </div>
    </div>
  );
}

function AdminTableShell({
  title,
  filter,
  loading,
  error,
  empty,
  children
}: {
  title: string;
  filter?: React.ReactNode;
  loading: boolean;
  error: string | null;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-black text-oto-text">{title}</h2>
        {filter}
      </div>
      <div className="mt-4">
        {loading ? <LoadingState /> : null}
        {!loading && error ? <ErrorState message={error} /> : null}
        {!loading && !error && empty ? <EmptyState title="Kayıt yok" body="Bu filtre için sonuç bulunamadı." /> : null}
        {!loading && !error && !empty ? children : null}
      </div>
    </section>
  );
}

function AuditLogList({ logs }: { logs: AuditRow[] }) {
  return (
    <section className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <h2 className="text-lg font-black text-oto-text">Son admin işlemleri</h2>
      {logs.length === 0 ? (
        <p className="mt-3 text-sm font-bold text-oto-muted">Henüz işlem kaydı yok.</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-md bg-oto-surface p-3 text-sm font-bold text-oto-muted">
              <span className="text-oto-text">{log.action}</span> · {log.entity_type} · {formatDate(log.created_at)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SmallButton({ children, onClick, variant = "primary" }: { children: React.ReactNode; onClick: () => void; variant?: "primary" | "secondary" }) {
  return (
    <Button type="button" variant={variant} onClick={onClick} className="h-9 px-3 text-xs">
      {children}
    </Button>
  );
}

function adminNavLabel(section: AdminSection, dictionary: ClientDictionary) {
  if (section === "dashboard") return "Dashboard";
  return String(dictionary.admin?.[section] ?? section);
}

async function countRows(query: PromiseLike<{ count: number | null; error: { message: string } | null }>) {
  const result = await query;
  return result.error ? 0 : result.count ?? 0;
}

async function logAdminAction(userId: string, action: string, entityType: string, entityId: string, metadata: Record<string, unknown>) {
  const supabase = getSupabaseBrowserClient();
  await supabase.from("admin_audit_logs").insert({
    actor_user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata
  });
}

function moderationLabel(status?: string | null) {
  if (status === "active") return "Onaylandı";
  if (status === "pending_review") return "Onay bekliyor";
  if (status === "rejected") return "Reddedildi";
  if (status === "archived") return "Arşivlendi";
  return status || "Yok";
}

function reportReasonLabel(reason?: string | null) {
  const labels: Record<string, string> = {
    fraud: "Dolandırıcılık şüphesi",
    wrong_information: "Yanlış bilgi",
    duplicate: "Tekrarlanan ilan",
    inappropriate_content: "Uygunsuz içerik",
    suspicious_seller: "Şüpheli satıcı",
    other: "Diğer"
  };
  return reason ? labels[reason] ?? reason : "Sebep yok";
}

function formatDate(value?: string | null) {
  if (!value) return "Tarih yok";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function maskId(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}
