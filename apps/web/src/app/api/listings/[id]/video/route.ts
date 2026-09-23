import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { releaseHeaders, YOLMOD_STORAGE_RELEASE_SEGMENT } from "@/lib/release/compatibility";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store, max-age=0", Vary: "Authorization" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const out = (body: object, status = 200) => NextResponse.json(body, { status, headers });
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authorization = request.headers.get("authorization"); const { id } = await context.params;
  if (!authorization?.startsWith("Bearer ") || !uuid.test(id)) return out({ error: "Oturum gerekli." }, 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim(), key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim(); if (!url || !key) return out({ error: "Video servisi kullanılamıyor." }, 500);
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { ...releaseHeaders(), Authorization: authorization } } });
  const { data: user } = await supabase.auth.getUser(); if (!user.user) return out({ error: "Oturum gerekli." }, 401);
  const { data: listing } = await supabase.schema("marketplace").from("listings").select("id").eq("id", id).eq("seller_id", user.user.id).maybeSingle();
  if (!listing) return out({ error: "İlan bulunamadı." }, 404);
  const { data: video } = await supabase.schema("marketplace").from("listing_videos").select("id,status,moderation_status,visibility,duration_seconds,created_at,updated_at").eq("listing_id", id).eq("is_current", true).maybeSingle();
  const probe = `${user.user.id}/${YOLMOD_STORAGE_RELEASE_SEGMENT}/${id}/probe.mp4`;
  const { data: manageable } = await supabase.rpc("can_manage_own_listing_video_storage_path", { p_storage_path: probe });
  const { data: publiclyEligible } = video ? await supabase.rpc("is_listing_video_publicly_eligible", { p_video_id: video.id }) : { data: false };
  const management = { canUpload: manageable === true && !video, canReplace: manageable === true && Boolean(video), canRemove: manageable === true && Boolean(video) };
  if (!video) return out({ data: { listingId: id, management, video: null } });
  const state = video.moderation_status === "rejected" ? "rejected" : video.status === "active" && video.visibility === "public" ? "approved" : "pending";
  return out({ data: { listingId: id, management, video: { id: video.id, state, moderationState: video.moderation_status, isPublic: publiclyEligible === true, durationSeconds: video.duration_seconds, createdAt: video.created_at, updatedAt: video.updated_at } } });
}
