"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import type { Locale } from "@/i18n/types";
import { SafeImage } from "@/components/ui/SafeImage";
import { getSupabaseBrowserClient, hasSupabaseEnv } from "@/lib/supabase/client";
import { isMissingAuthSessionError } from "@/lib/auth/auth-ui";
import { safeAdminNextPath } from "@/lib/auth/admin-return-path";
import { cityLabel, formatPrice } from "@/lib/format";
import { signStorageUrlMap } from "@/lib/media/storage-urls";
import type { ServiceProviderApplicationAdminRow } from "@/lib/supabase/types";
import { getAdminNavigationCopy, type AdminNavigationCopy } from "./admin-navigation-copy";

type AdminSection = "dashboard" | "listings" | "videos" | "services" | "reports" | "users" | "settings";

type AdminState = {
  status: "loading" | "login" | "denied" | "ready" | "error";
  userId: string | null;
  role: string | null;
  error: string | null;
};

type ListingRow = {
  listing_id: string;
  title: string | null;
  status: string | null;
  moderation_status: string | null;
  price_amount: number | null;
  currency: string | null;
  city: string | null;
  seller_type: string | null;
  quality_score: number | null;
  created_at: string | null;
  make_name: string | null;
  model_name: string | null;
  year: number | null;
  preview_path: string | null;
  preview_url?: string | null;
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
  const { locale } = useI18n();
  const adminNavigation = getAdminNavigationCopy(locale);
  const copy = getAdminRuntimeCopy(locale);
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminState>({ status: "loading", userId: null, role: null, error: null });

  useEffect(() => {
    async function checkAdmin() {
      if (!hasSupabaseEnv()) {
        setAdmin({ status: "error", userId: null, role: null, error: copy.missingConfiguration });
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
  }, [copy.missingConfiguration]);

  useEffect(() => {
    if (admin.status === "login") {
      const next = safeAdminNextPath(pathname);
      router.replace(`/admin/login?next=${encodeURIComponent(next)}`);
    }
  }, [admin.status, pathname, router]);

  return (
    <>
      <AppHeader />
      <PageContainer className="pb-28">
        <div className="mb-5 rounded-oto border border-oto-border bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-oto-blue">Jolmod Admin</p>
              <h1 className="mt-1 text-2xl font-black text-oto-text">{adminNavLabel(section, adminNavigation)}</h1>
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
                {adminNavLabel(item.section, adminNavigation)}
              </Link>
            ))}
          </nav>
        </div>

        {admin.status === "loading" ? <LoadingState /> : null}
        {admin.status === "login" ? <LoadingState /> : null}
        {admin.status === "denied" ? (
          <ErrorState message={copy.accessDenied} />
        ) : null}
        {admin.status === "error" ? <ErrorState message={admin.error ?? copy.accessCheckFailed} /> : null}
        {admin.status === "ready" && admin.userId ? <AdminSectionContent section={section} userId={admin.userId} role={admin.role ?? "moderator"} locale={locale} /> : null}
      </PageContainer>
      <MarketplaceFooter />
      <MobileBottomNav />
    </>
  );
}

function AdminSectionContent({ section, userId, role, locale }: { section: AdminSection; userId: string; role: string; locale: Locale }) {
  if (section === "dashboard") return <Dashboard userId={userId} locale={locale} />;
  if (section === "listings") return <ListingsModeration userId={userId} locale={locale} />;
  if (section === "videos") return <VideosModeration userId={userId} locale={locale} />;
  if (section === "services") return <ServiceApplicationsModeration locale={locale} />;
  if (section === "reports") return <ReportsModeration userId={userId} locale={locale} />;
  if (section === "users") return <UsersOverview locale={locale} />;
  return <AdminSettings role={role} locale={locale} />;
}

function Dashboard({ userId, locale }: { userId: string; locale: Locale }) {
  const copy = getAdminRuntimeCopy(locale);
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
        { label: copy.totalListings, value: totalListings },
        { label: copy.pendingListings, value: pendingListings },
        { label: copy.activeListings, value: activeListings },
        { label: copy.rejectedListings, value: rejectedListings },
        { label: copy.pendingVideos, value: pendingVideos },
        { label: copy.openReports, value: openReports },
        { label: copy.totalUsers, value: profiles }
      ]);
      setAuditLogs((logs.data ?? []) as AuditRow[]);
      setLoading(false);
    }

    void load();
  }, [copy, userId]);

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
      <AuditLogList logs={auditLogs} copy={copy} locale={locale} />
    </div>
  );
}

function ListingsModeration({ userId, locale }: { userId: string; locale: Locale }) {
  const copy = getListingModerationCopy(locale);
  const [rows, setRows] = useState<ListingRow[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviewingListingId, setReviewingListingId] = useState<string | null>(null);

  const load = useCallback(async function load() {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { data, error: listingError } = await supabase.rpc("admin_list_listing_moderation", {
      p_moderation_status: filter === "all" ? null : filter,
      p_limit: 50
    });
    if (listingError) {
      setError(listingError.message);
      setLoading(false);
      return;
    }

    const listings = (data ?? []) as ListingRow[];
    const previewPaths = Array.from(new Set(listings.map((item) => item.preview_path).filter((path): path is string => Boolean(path))));
    const signedPreviews = new Map(await Promise.all(previewPaths.map(async (path) => {
      const { data: signed, error } = await supabase.storage.from("listing-media").createSignedUrl(path, 60 * 60);
      return [path, error ? null : signed?.signedUrl ?? null] as const;
    })));

    setRows(listings.map((item) => ({ ...item, preview_url: item.preview_path ? signedPreviews.get(item.preview_path) ?? null : null })));
    setError(null);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(listing: ListingRow, action: "approve" | "reject") {
    const note = action === "approve" ? null : window.prompt(copy.rejectionReason)?.trim() ?? null;
    if (action === "reject" && !note) return;
    const supabase = getSupabaseBrowserClient();
    setError(null);
    setReviewingListingId(listing.listing_id);
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (!accessToken) {
      setError(copy.sessionMissing);
      setReviewingListingId(null);
      return;
    }

    const response = await fetch("/api/admin/listings/review", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        listingId: listing.listing_id,
        decision: action,
        rejectionReason: note
      })
    });
    const payload = await response.json().catch(() => null) as { error?: string } | null;

    if (!response.ok) {
      setError(payload?.error ?? copy.reviewFailed);
      setReviewingListingId(null);
      return;
    }

    setReviewingListingId(null);
    await load();
  }

  return (
    <AdminTableShell
      title={copy.title}
      filter={
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-md border border-oto-border bg-white px-3 text-sm font-bold">
          <option value="all">{copy.all}</option>
          <option value="pending_review">{copy.pending}</option>
          <option value="active">{copy.approved}</option>
          <option value="rejected">{copy.rejected}</option>
          <option value="archived">{copy.archived}</option>
        </select>
      }
      loading={loading}
      error={error}
      empty={rows.length === 0}
      copy={getAdminRuntimeCopy(locale)}
    >
      {rows.map((row) => {
        const makeModel = [row.make_name, row.model_name, row.year].filter(Boolean).join(" ");
        return (
          <div key={row.listing_id} className="grid gap-3 border-b border-oto-border py-4 last:border-b-0 lg:grid-cols-[88px_1.3fr_1fr_0.9fr_1.4fr] lg:items-center">
            <div className="aspect-[4/3] overflow-hidden rounded-md bg-oto-surface">
              <SafeImage src={row.preview_url} alt={row.title || copy.listing} />
            </div>
            <div>
              <p className="font-black text-oto-text">{row.title || copy.listing}</p>
              <div className="mt-1">
                <Badge variant="primary">{t(locale, "verticals.cars.shortLabel")}</Badge>
              </div>
              <p className="mt-1 text-xs font-bold text-oto-muted">{makeModel || copy.vehicleMissing}</p>
            </div>
            <div className="text-sm font-bold text-oto-muted">
              <p>{row.city ? cityLabel(row.city, locale) : copy.cityMissing} · {row.seller_type || copy.seller}</p>
              <p>{formatPrice(row.price_amount, row.currency, locale)} · {copy.quality} {row.quality_score ?? 0}</p>
            </div>
            <div className="text-xs font-black text-oto-muted">
              <p>{copy.status}: {row.status}</p>
              <p>{copy.moderation}: {moderationLabel(row.moderation_status, locale)}</p>
            </div>
            <div className="flex flex-wrap gap-2 lg:justify-end">
              {row.moderation_status === "pending_review" ? (
                <>
                  <SmallButton onClick={() => moderate(row, "approve")} disabled={Boolean(reviewingListingId)}>
                    {reviewingListingId === row.listing_id ? copy.processing : copy.approve}
                  </SmallButton>
                  <SmallButton onClick={() => moderate(row, "reject")} variant="secondary" disabled={Boolean(reviewingListingId)}>
                    {copy.reject}
                  </SmallButton>
                </>
              ) : (
                <span className="rounded-md bg-oto-surface px-3 py-2 text-xs font-black text-oto-muted">{copy.decisionClosed}</span>
              )}
              <Link href={localizePath(`/listing/${row.listing_id}`, locale)} className="rounded-md border border-oto-border px-3 py-2 text-xs font-black text-oto-text">{copy.open}</Link>
            </div>
          </div>
        );
      })}
    </AdminTableShell>
  );
}

function VideosModeration({ userId, locale }: { userId: string; locale: Locale }) {
  const copy = getAdminRuntimeCopy(locale);
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
    const videoRows = (data ?? []) as VideoRow[];
    const signedVideos = await signStorageUrlMap(
      supabase,
      "listing-videos",
      videoRows.flatMap((row) => [row.video_url, row.thumbnail_url, row.poster_url])
    );
    setRows(videoRows.map((row) => ({
      ...row,
      video_url: signedVideos.get(row.video_url ?? "") ?? null,
      thumbnail_url: signedVideos.get(row.thumbnail_url ?? "") ?? null,
      poster_url: signedVideos.get(row.poster_url ?? "") ?? null
    })));
    setError(videoError?.message ?? null);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(video: VideoRow, action: "approve" | "reject" | "archive") {
    const note = action === "approve" ? null : window.prompt(copy.rejectionReason)?.trim() ?? null;
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
      title={copy.videoModeration}
      filter={
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-md border border-oto-border bg-white px-3 text-sm font-bold">
          <option value="all">{copy.all}</option>
          <option value="pending_review">{copy.pending}</option>
          <option value="approved">{copy.approved}</option>
          <option value="rejected">{copy.rejected}</option>
          <option value="archived">{copy.archived}</option>
        </select>
      }
      loading={loading}
      error={error}
      empty={rows.length === 0}
      copy={copy}
    >
      {rows.map((row) => (
        <div key={row.id} className="grid gap-3 border-b border-oto-border py-4 last:border-b-0 lg:grid-cols-[80px_1.2fr_1fr_1.5fr] lg:items-center">
          <div className="aspect-[9/12] overflow-hidden rounded-md bg-oto-surface">
            {row.poster_url || row.thumbnail_url ? <SafeImage src={row.poster_url || row.thumbnail_url} alt={copy.videoPreview} /> : <div className="flex h-full items-center justify-center text-xs font-black text-oto-muted">{copy.video}</div>}
          </div>
          <div>
            <p className="font-black text-oto-text">{row.title || copy.vehicleVideo}</p>
            <p className="mt-1 text-xs font-bold text-oto-muted">{row.listing_id || copy.noListingLink}</p>
          </div>
          <div className="text-xs font-black text-oto-muted">
            <p>{copy.status}: {row.status}</p>
            <p>{copy.moderation}: {row.moderation_status}</p>
            <p>{copy.processing}: {row.processing_status}</p>
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <SmallButton onClick={() => moderate(row, "approve")}>{copy.approve}</SmallButton>
            <SmallButton onClick={() => moderate(row, "reject")} variant="secondary">{copy.reject}</SmallButton>
            <SmallButton onClick={() => moderate(row, "archive")} variant="secondary">{copy.archive}</SmallButton>
            {row.listing_id ? <Link href={localizePath(`/listing/${row.listing_id}`, locale)} className="rounded-md border border-oto-border px-3 py-2 text-xs font-black text-oto-text">{copy.listing}</Link> : null}
            <Link href={localizePath(row.listing_id ? `/video?listing=${row.listing_id}` : "/video", locale)} className="rounded-md border border-oto-border px-3 py-2 text-xs font-black text-oto-text">{copy.preview}</Link>
          </div>
        </div>
      ))}
    </AdminTableShell>
  );
}

function ServiceApplicationsModeration({ locale }: { locale: Locale }) {
  const copy = getAdminRuntimeCopy(locale);
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
    const note = window.prompt(copy.shortNote, defaultNote)?.trim() ?? null;
    if ((status === "rejected" || status === "archived") && !note) return;
    const supabase = getSupabaseBrowserClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;
    if (sessionError || !accessToken) {
      setError(sessionError?.message ?? copy.sessionMissing);
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
      setError(result?.error ?? copy.serviceUpdateFailed);
      return;
    }

    await load();
  }

  return (
    <AdminTableShell
      title={t(locale, "services.admin.title")}
      filter={
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-md border border-oto-border bg-white px-3 text-sm font-bold">
          <option value="all">{copy.all}</option>
          <option value="pending_review">{copy.pending}</option>
          <option value="reviewing">{copy.reviewing}</option>
          <option value="approved">{copy.approved}</option>
          <option value="rejected">{copy.rejected}</option>
          <option value="archived">{copy.archived}</option>
        </select>
      }
      loading={loading}
      error={error}
      empty={rows.length === 0}
      copy={copy}
    >
      {rows.map((row) => (
        <div key={row.application_id} className="grid gap-3 border-b border-oto-border py-4 last:border-b-0 lg:grid-cols-[1.2fr_1fr_1fr_1.3fr] lg:items-center">
          <div>
            <p className="font-black text-oto-text">{row.business_name || copy.serviceApplication}</p>
            <p className="mt-1 text-xs font-bold text-oto-muted">{row.contact_person_name || "-"} · {row.contact_phone || "-"}</p>
            {row.website_url ? <p className="mt-1 break-all text-xs font-bold text-oto-blue">{row.website_url}</p> : null}
          </div>
          <div className="text-xs font-bold text-oto-muted">
            <p>{[row.city ? cityLabel(row.city, locale) : null, row.district].filter(Boolean).join(" / ") || copy.locationMissing}</p>
            <p>{(row.supported_verticals ?? []).join(", ") || copy.noVehicleType}</p>
          </div>
          <div className="text-xs font-bold text-oto-muted">
            <p>{(row.category_keys ?? []).join(", ") || copy.noCategory}</p>
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

function ReportsModeration({ userId, locale }: { userId: string; locale: Locale }) {
  const copy = getAdminRuntimeCopy(locale);
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
    const note = status === "reviewing" ? null : window.prompt(copy.resolutionNote)?.trim() ?? null;
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
      title={copy.reports}
      filter={
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 rounded-md border border-oto-border bg-white px-3 text-sm font-bold">
          <option value="all">{copy.all}</option>
          <option value="open">{copy.open}</option>
          <option value="reviewing">{copy.reviewing}</option>
          <option value="resolved">{copy.resolved}</option>
          <option value="dismissed">{copy.dismissed}</option>
        </select>
      }
      loading={loading}
      error={error}
      empty={rows.length === 0}
      copy={copy}
    >
      {rows.map((row) => (
        <div key={row.id} className="grid gap-3 border-b border-oto-border py-4 last:border-b-0 lg:grid-cols-[1fr_1.1fr_1fr_1.3fr] lg:items-center">
          <div>
            <p className="font-black text-oto-text">{reportReasonLabel(row.reason, locale)}</p>
            <p className="mt-1 line-clamp-2 text-xs font-bold text-oto-muted">{row.description || copy.noDescription}</p>
          </div>
          <div className="text-xs font-bold text-oto-muted">
            <p>{copy.listing}: {row.listing_id || "-"}</p>
            <p>{copy.video}: {row.video_id || "-"}</p>
            <p>{copy.user}: {row.reported_user_id || "-"}</p>
          </div>
          <div className="text-sm font-black text-oto-muted">{row.status}</div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <SmallButton onClick={() => updateReport(row, "reviewing")}>{copy.review}</SmallButton>
            <SmallButton onClick={() => updateReport(row, "resolved")} variant="secondary">{copy.resolve}</SmallButton>
            <SmallButton onClick={() => updateReport(row, "dismissed")} variant="secondary">{copy.dismiss}</SmallButton>
            {row.listing_id ? <Link href={localizePath(`/listing/${row.listing_id}`, locale)} className="rounded-md border border-oto-border px-3 py-2 text-xs font-black text-oto-text">{copy.listing}</Link> : null}
          </div>
        </div>
      ))}
    </AdminTableShell>
  );
}

function UsersOverview({ locale }: { locale: Locale }) {
  const copy = getAdminRuntimeCopy(locale);
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
    <AdminTableShell title={copy.usersAndSellers} loading={loading} error={error} empty={rows.length === 0} copy={copy}>
      {rows.map((row) => (
        <div key={row.id} className="grid gap-2 border-b border-oto-border py-4 last:border-b-0 md:grid-cols-[1fr_1fr_1fr] md:items-center">
          <div>
            <p className="font-black text-oto-text">{row.display_name || row.full_name || copy.user}</p>
            <p className="mt-1 text-xs font-bold text-oto-muted">{maskId(row.id)}</p>
          </div>
          <p className="text-sm font-bold text-oto-muted">{row.seller_type || copy.privateSeller} · {row.city ? cityLabel(row.city, locale) : copy.cityMissing}</p>
          <p className="text-sm font-bold text-oto-muted md:text-right">{formatDate(row.created_at, locale, copy.dateMissing)}</p>
        </div>
      ))}
    </AdminTableShell>
  );
}

function AdminSettings({ role, locale }: { role: string; locale: Locale }) {
  const copy = getAdminRuntimeCopy(locale);
  return (
    <div className="grid gap-4">
      <div className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <h2 className="text-lg font-black text-oto-text">{copy.adminRole}</h2>
        <p className="mt-2 text-sm font-bold text-oto-muted">{copy.currentRole}: <span className="text-oto-text">{role}</span></p>
      </div>
      <div className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <h2 className="text-lg font-black text-oto-text">Bootstrap</h2>
        <p className="mt-2 text-sm leading-6 text-oto-muted">{copy.bootstrapHelp}</p>
        <pre className="mt-4 overflow-x-auto rounded-md bg-oto-text p-4 text-xs font-bold text-white">{`insert into public.admin_users (user_id, role, is_active)
values ('YOUR_AUTH_USER_ID', 'owner', true)
on conflict (user_id)
do update set role = excluded.role, is_active = excluded.is_active;`}</pre>
      </div>
      <div className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <h2 className="text-lg font-black text-oto-text">{copy.policyLinks}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/moderation-policy" className="rounded-md border border-oto-border px-3 py-2 text-sm font-black text-oto-text hover:border-oto-blue">
            {copy.moderationPolicy}
          </Link>
          <Link href="/listing-rules" className="rounded-md border border-oto-border px-3 py-2 text-sm font-black text-oto-text hover:border-oto-blue">
            {copy.listingRules}
          </Link>
          <Link href="/trust" className="rounded-md border border-oto-border px-3 py-2 text-sm font-black text-oto-text hover:border-oto-blue">
            {copy.trustCenter}
          </Link>
        </div>
      </div>
      <div className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
        <h2 className="text-lg font-black text-oto-text">{copy.notes}</h2>
        <div className="mt-3 grid gap-2 text-sm leading-6 text-oto-muted">
          <p>{copy.rolesNote}</p>
          <p>{copy.reportsNote}</p>
          <p>{copy.auditNote}</p>
          <p>{copy.performanceNote}</p>
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
  copy,
  children
}: {
  title: string;
  filter?: React.ReactNode;
  loading: boolean;
  error: string | null;
  empty: boolean;
  copy?: ReturnType<typeof getAdminRuntimeCopy>;
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
        {!loading && !error && empty ? <EmptyState title={copy?.noRecords ?? "Записей нет"} body={copy?.noResults ?? "По этому фильтру ничего не найдено."} /> : null}
        {!loading && !error && !empty ? children : null}
      </div>
    </section>
  );
}

function AuditLogList({ logs, copy, locale }: { logs: AuditRow[]; copy: ReturnType<typeof getAdminRuntimeCopy>; locale: Locale }) {
  return (
    <section className="rounded-oto border border-oto-border bg-white p-5 shadow-soft">
      <h2 className="text-lg font-black text-oto-text">{copy.recentAdminActions}</h2>
      {logs.length === 0 ? (
        <p className="mt-3 text-sm font-bold text-oto-muted">{copy.noActions}</p>
      ) : (
        <div className="mt-3 grid gap-2">
          {logs.map((log) => (
            <div key={log.id} className="rounded-md bg-oto-surface p-3 text-sm font-bold text-oto-muted">
              <span className="text-oto-text">{log.action}</span> · {log.entity_type} · {formatDate(log.created_at, locale, copy.dateMissing)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SmallButton({ children, onClick, variant = "primary", disabled = false }: { children: React.ReactNode; onClick: () => void; variant?: "primary" | "secondary"; disabled?: boolean }) {
  return (
    <Button type="button" variant={variant} onClick={onClick} disabled={disabled} className="h-9 px-3 text-xs">
      {children}
    </Button>
  );
}

function adminNavLabel(section: AdminSection, copy: AdminNavigationCopy) {
  return copy[section];
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

function moderationLabel(status: string | null | undefined, locale: Locale) {
  const copy = getListingModerationCopy(locale);
  if (status === "active") return copy.approved;
  if (status === "pending_review") return copy.pending;
  if (status === "rejected") return copy.rejected;
  if (status === "archived") return copy.archived;
  return status || copy.none;
}

function getListingModerationCopy(locale: Locale) {
  const copies = {
    ru: { title: "Модерация объявлений", all: "Все", pending: "Ожидают проверки", approved: "Одобрено", rejected: "Отклонено", archived: "В архиве", listing: "Объявление", vehicleMissing: "Нет данных автомобиля", cityMissing: "Город не указан", seller: "продавец", quality: "Качество", status: "Статус", moderation: "Модерация", processing: "Обработка", approve: "Одобрить", reject: "Отклонить", decisionClosed: "Решение принято", open: "Открыть", none: "Нет", sessionMissing: "Сессия администратора не найдена.", reviewFailed: "Не удалось завершить модерацию объявления.", rejectionReason: "Короткая причина / комментарий" },
    kk: { title: "Хабарландыруларды модерациялау", all: "Барлығы", pending: "Тексеруді күтуде", approved: "Мақұлданды", rejected: "Қабылданбады", archived: "Мұрағатта", listing: "Хабарландыру", vehicleMissing: "Көлік деректері жоқ", cityMissing: "Қала көрсетілмеген", seller: "сатушы", quality: "Сапа", status: "Күйі", moderation: "Модерация", processing: "Өңделуде", approve: "Мақұлдау", reject: "Қабылдамау", decisionClosed: "Шешім қабылданды", open: "Ашу", none: "Жоқ", sessionMissing: "Әкімші сессиясы табылмады.", reviewFailed: "Хабарландыру модерациясын аяқтау мүмкін болмады.", rejectionReason: "Қысқа себеп / түсініктеме" },
    en: { title: "Listing moderation", all: "All", pending: "Pending review", approved: "Approved", rejected: "Rejected", archived: "Archived", listing: "Listing", vehicleMissing: "Vehicle information unavailable", cityMissing: "City not provided", seller: "seller", quality: "Quality", status: "Status", moderation: "Moderation", processing: "Processing", approve: "Approve", reject: "Reject", decisionClosed: "Decision closed", open: "Open", none: "None", sessionMissing: "Admin session was not found.", reviewFailed: "Listing moderation could not be completed.", rejectionReason: "Short reason / note" },
    "zh-CN": { title: "房源审核", all: "全部", pending: "等待审核", approved: "已批准", rejected: "已拒绝", archived: "已归档", listing: "房源", vehicleMissing: "暂无车辆信息", cityMissing: "未填写城市", seller: "卖家", quality: "质量", status: "状态", moderation: "审核", processing: "处理中", approve: "批准", reject: "拒绝", decisionClosed: "决定已完成", open: "打开", none: "无", sessionMissing: "未找到管理员会话。", reviewFailed: "无法完成房源审核。", rejectionReason: "简短原因 / 说明" }
  } as const;
  return locale === "kk" || locale === "en" || locale === "zh-CN" ? copies[locale] : copies.ru;
}

function getAdminRuntimeCopy(locale: Locale) {
  const copies = {
    ru: {
      missingConfiguration: "Не настроено окружение Supabase.", accessDenied: "У вас нет доступа к этому разделу.", accessCheckFailed: "Не удалось проверить доступ администратора.",
      totalListings: "Всего объявлений", pendingListings: "Ожидают проверки", activeListings: "Активные объявления", rejectedListings: "Отклонённые объявления", pendingVideos: "Ожидают видео", openReports: "Открытые жалобы", totalUsers: "Всего пользователей/продавцов",
      all: "Все", pending: "Ожидает проверки", approved: "Одобрено", rejected: "Отклонено", archived: "В архиве", reviewing: "На проверке", open: "Открыто", resolved: "Решено", dismissed: "Закрыто", status: "Статус", moderation: "Модерация", videoModeration: "Модерация видео", processing: "Обработка", approve: "Одобрить", reject: "Отклонить", archive: "Архивировать", preview: "Предпросмотр", listing: "Объявление", video: "Видео", vehicleVideo: "Видео автомобиля", videoPreview: "Предпросмотр видео", noListingLink: "Нет ссылки на объявление",
      rejectionReason: "Короткая причина / комментарий", shortNote: "Короткий комментарий", resolutionNote: "Комментарий к решению", sessionMissing: "Сессия администратора не найдена.", serviceUpdateFailed: "Не удалось обновить заявку на сервис.", serviceApplication: "Заявка на сервис", locationMissing: "Место не указано", noVehicleType: "Тип автомобиля не указан", noCategory: "Категория не указана",
      reports: "Жалобы", review: "Проверить", resolve: "Решить", dismiss: "Закрыть", noDescription: "Нет описания", user: "Пользователь", usersAndSellers: "Пользователи и продавцы", privateSeller: "частный", cityMissing: "Город не указан",
      adminRole: "Роль администратора", currentRole: "Текущая роль", bootstrapHelp: "Первого администратора необходимо добавить через SQL Editor Supabase или service role.", policyLinks: "Ссылки на правила", moderationPolicy: "Политика модерации", listingRules: "Правила объявлений", trustCenter: "Центр безопасности", notes: "Примечания", rolesNote: "Ролями администратора следует управлять внимательно. Обычные пользователи не могут читать данные администратора.", reportsNote: "Жалобы конфиденциальны и не отображаются на публичных страницах.", auditNote: "Действия модерации записываются в public.admin_audit_logs.", performanceNote: "Для правил производительности используйте раздел Performance Guardrails в README apps/web.", noRecords: "Записей нет", noResults: "По этому фильтру ничего не найдено.", recentAdminActions: "Последние действия администратора", noActions: "Действий пока нет.", dateMissing: "Дата не указана",
      reasonFraud: "Подозрение на мошенничество", reasonWrongInformation: "Неверная информация", reasonDuplicate: "Повторное объявление", reasonInappropriateContent: "Недопустимое содержание", reasonSuspiciousSeller: "Подозрительный продавец", other: "Другое", reasonMissing: "Причина не указана"
    },
    kk: {
      missingConfiguration: "Supabase ортасының айнымалылары бапталмаған.", accessDenied: "Бұл бөлімге кіруге рұқсатыңыз жоқ.", accessCheckFailed: "Әкімші рұқсатын тексеру мүмкін болмады.",
      totalListings: "Барлық хабарландыру", pendingListings: "Тексеруді күтуде", activeListings: "Белсенді хабарландырулар", rejectedListings: "Қабылданбаған хабарландырулар", pendingVideos: "Күтілетін бейнелер", openReports: "Ашық шағымдар", totalUsers: "Барлық пайдаланушы/сатушы",
      all: "Барлығы", pending: "Тексеруді күтуде", approved: "Мақұлданды", rejected: "Қабылданбады", archived: "Мұрағатта", reviewing: "Қаралуда", open: "Ашық", resolved: "Шешілді", dismissed: "Жабылды", status: "Күйі", moderation: "Модерация", videoModeration: "Бейне модерациясы", processing: "Өңделуде", approve: "Мақұлдау", reject: "Қабылдамау", archive: "Мұрағаттау", preview: "Алдын ала қарау", listing: "Хабарландыру", video: "Бейне", vehicleVideo: "Көлік бейнесі", videoPreview: "Бейнені алдын ала қарау", noListingLink: "Хабарландыру сілтемесі жоқ",
      rejectionReason: "Қысқа себеп / түсініктеме", shortNote: "Қысқа ескертпе", resolutionNote: "Шешім ескертпесі", sessionMissing: "Әкімші сессиясы табылмады.", serviceUpdateFailed: "Қызмет өтінімін жаңарту мүмкін болмады.", serviceApplication: "Қызмет өтінімі", locationMissing: "Орналасқан жері көрсетілмеген", noVehicleType: "Көлік түрі көрсетілмеген", noCategory: "Санат көрсетілмеген",
      reports: "Шағымдар", review: "Қарау", resolve: "Шешу", dismiss: "Жабу", noDescription: "Сипаттама жоқ", user: "Пайдаланушы", usersAndSellers: "Пайдаланушылар мен сатушылар", privateSeller: "жеке", cityMissing: "Қала көрсетілмеген",
      adminRole: "Әкімші рөлі", currentRole: "Ағымдағы рөл", bootstrapHelp: "Алғашқы әкімшіні Supabase SQL Editor немесе service role арқылы қосу қажет.", policyLinks: "Ереже сілтемелері", moderationPolicy: "Модерация саясаты", listingRules: "Хабарландыру ережелері", trustCenter: "Қауіпсіздік орталығы", notes: "Ескертпелер", rolesNote: "Әкімші рөлдерін мұқият басқару керек. Қарапайым пайдаланушылар әкімші деректерін оқи алмайды.", reportsNote: "Шағымдар құпия болып табылады және ашық беттерде көрсетілмейді.", auditNote: "Модерация әрекеттері public.admin_audit_logs ішінде жазылады.", performanceNote: "Өнімділік ережелері үшін apps/web README ішіндегі Performance Guardrails бөлімін пайдаланыңыз.", noRecords: "Жазбалар жоқ", noResults: "Осы сүзгі үшін нәтиже табылмады.", recentAdminActions: "Соңғы әкімші әрекеттері", noActions: "Әрекет жазбасы әлі жоқ.", dateMissing: "Күні көрсетілмеген",
      reasonFraud: "Алаяқтық күдігі", reasonWrongInformation: "Қате ақпарат", reasonDuplicate: "Қайталанған хабарландыру", reasonInappropriateContent: "Орынсыз мазмұн", reasonSuspiciousSeller: "Күдікті сатушы", other: "Басқа", reasonMissing: "Себебі көрсетілмеген"
    },
    en: {
      missingConfiguration: "Supabase environment variables are not configured.", accessDenied: "You do not have access to this area.", accessCheckFailed: "Admin access could not be verified.",
      totalListings: "Total listings", pendingListings: "Pending listings", activeListings: "Active listings", rejectedListings: "Rejected listings", pendingVideos: "Pending videos", openReports: "Open reports", totalUsers: "Total users/sellers",
      all: "All", pending: "Pending review", approved: "Approved", rejected: "Rejected", archived: "Archived", reviewing: "Under review", open: "Open", resolved: "Resolved", dismissed: "Closed", status: "Status", moderation: "Moderation", videoModeration: "Video moderation", processing: "Processing", approve: "Approve", reject: "Reject", archive: "Archive", preview: "Preview", listing: "Listing", video: "Video", vehicleVideo: "Vehicle video", videoPreview: "Video preview", noListingLink: "No listing link",
      rejectionReason: "Short reason / note", shortNote: "Short note", resolutionNote: "Resolution note", sessionMissing: "Admin session was not found.", serviceUpdateFailed: "Service application could not be updated.", serviceApplication: "Service application", locationMissing: "Location not provided", noVehicleType: "Vehicle type not provided", noCategory: "Category not provided",
      reports: "Reports", review: "Review", resolve: "Resolve", dismiss: "Close", noDescription: "No description", user: "User", usersAndSellers: "Users and sellers", privateSeller: "private", cityMissing: "City not provided",
      adminRole: "Admin role", currentRole: "Current role", bootstrapHelp: "The first admin must be added through Supabase SQL Editor or a service role.", policyLinks: "Policy links", moderationPolicy: "Moderation policy", listingRules: "Listing rules", trustCenter: "Trust center", notes: "Notes", rolesNote: "Admin roles must be managed carefully. Standard users cannot read admin data.", reportsNote: "Reports are private and never appear on public pages.", auditNote: "Moderation actions are written to public.admin_audit_logs.", performanceNote: "Use the Performance Guardrails section in apps/web README for performance guidance.", noRecords: "No records", noResults: "No results were found for this filter.", recentAdminActions: "Recent admin actions", noActions: "No actions recorded yet.", dateMissing: "Date not provided",
      reasonFraud: "Suspected fraud", reasonWrongInformation: "Incorrect information", reasonDuplicate: "Duplicate listing", reasonInappropriateContent: "Inappropriate content", reasonSuspiciousSeller: "Suspicious seller", other: "Other", reasonMissing: "Reason not provided"
    },
    "zh-CN": {
      missingConfiguration: "Supabase 环境变量未配置。", accessDenied: "您无权访问此区域。", accessCheckFailed: "无法验证管理员访问权限。",
      totalListings: "全部车辆信息", pendingListings: "待审核车辆信息", activeListings: "已发布车辆信息", rejectedListings: "已拒绝车辆信息", pendingVideos: "待审核视频", openReports: "未处理举报", totalUsers: "用户/卖家总数",
      all: "全部", pending: "等待审核", approved: "已批准", rejected: "已拒绝", archived: "已归档", reviewing: "审核中", open: "开放", resolved: "已解决", dismissed: "已关闭", status: "状态", moderation: "审核", videoModeration: "视频审核", processing: "处理中", approve: "批准", reject: "拒绝", archive: "归档", preview: "预览", listing: "车辆信息", video: "视频", vehicleVideo: "车辆视频", videoPreview: "视频预览", noListingLink: "没有车辆信息链接",
      rejectionReason: "简短原因 / 说明", shortNote: "简短说明", resolutionNote: "处理说明", sessionMissing: "未找到管理员会话。", serviceUpdateFailed: "无法更新服务申请。", serviceApplication: "服务申请", locationMissing: "未填写地点", noVehicleType: "未填写车辆类型", noCategory: "未填写类别",
      reports: "举报", review: "审核", resolve: "解决", dismiss: "关闭", noDescription: "暂无说明", user: "用户", usersAndSellers: "用户和卖家", privateSeller: "个人", cityMissing: "未填写城市",
      adminRole: "管理员角色", currentRole: "当前角色", bootstrapHelp: "必须通过 Supabase SQL Editor 或 service role 添加首位管理员。", policyLinks: "政策链接", moderationPolicy: "审核政策", listingRules: "车辆信息规则", trustCenter: "安全中心", notes: "说明", rolesNote: "必须谨慎管理管理员角色。普通用户无法读取管理员数据。", reportsNote: "举报为私密信息，绝不会显示在公开页面上。", auditNote: "审核操作会写入 public.admin_audit_logs。", performanceNote: "性能指引请参阅 apps/web README 中的 Performance Guardrails 部分。", noRecords: "暂无记录", noResults: "该筛选条件下没有结果。", recentAdminActions: "最近管理员操作", noActions: "暂未记录操作。", dateMissing: "未填写日期",
      reasonFraud: "疑似欺诈", reasonWrongInformation: "信息不正确", reasonDuplicate: "重复车辆信息", reasonInappropriateContent: "不当内容", reasonSuspiciousSeller: "可疑卖家", other: "其他", reasonMissing: "未填写原因"
    }
  } as const;
  return locale === "kk" || locale === "en" || locale === "zh-CN" ? copies[locale] : copies.ru;
}

function reportReasonLabel(reason: string | null | undefined, locale: Locale) {
  const copy = getAdminRuntimeCopy(locale);
  const labels: Record<string, string> = {
    fraud: copy.reasonFraud,
    wrong_information: copy.reasonWrongInformation,
    duplicate: copy.reasonDuplicate,
    inappropriate_content: copy.reasonInappropriateContent,
    suspicious_seller: copy.reasonSuspiciousSeller,
    other: copy.other
  };
  return reason ? labels[reason] ?? reason : copy.reasonMissing;
}

function formatDate(value: string | null | undefined, locale: Locale, fallback: string) {
  if (!value) return fallback;
  return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : locale === "kk" ? "kk-KZ" : locale === "en" ? "en-US" : "ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function maskId(value: string) {
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}
