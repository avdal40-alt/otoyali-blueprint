BEGIN;

-- A failed Storage delete must not require restoring a deleted media row.  Keep
-- the server-only cleanup capability durable and explicitly owner-scoped.
CREATE TABLE public.listing_media_cleanup_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES marketplace.listings(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_id uuid NOT NULL,
  storage_paths text[] NOT NULL CHECK (cardinality(storage_paths) > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_attempt_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listing_media_cleanup_tasks_pending_idx ON public.listing_media_cleanup_tasks (seller_id, listing_id, created_at) WHERE status = 'pending';
ALTER TABLE public.listing_media_cleanup_tasks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.listing_media_cleanup_tasks FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.remove_own_listing_media(p_listing_id uuid, p_media_id uuid)
RETURNS TABLE(original_path text, storage_path text, large_path text, card_path text, thumb_path text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketplace, vehicle, pg_catalog AS $$
DECLARE media_record vehicle.profile_media%ROWTYPE; v_paths text[]; v_cleanup_task_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  SELECT media.* INTO media_record FROM vehicle.profile_media media JOIN marketplace.listings listing ON listing.vehicle_profile_id = media.vehicle_profile_id
  WHERE media.id = p_media_id AND listing.id = p_listing_id AND listing.seller_id = auth.uid()
    AND listing.status = 'draft' AND listing.moderation_status IN ('pending_review', 'rejected');
  IF NOT FOUND THEN RAISE EXCEPTION 'media is not owned by this seller' USING ERRCODE = 'OT403'; END IF;
  v_paths := ARRAY(SELECT DISTINCT path FROM unnest(ARRAY[media_record.original_path, media_record.storage_path, media_record.large_path, media_record.card_path, media_record.thumb_path]) AS path WHERE path IS NOT NULL AND btrim(path) <> '');
  INSERT INTO public.listing_media_cleanup_tasks(listing_id, seller_id, media_id, storage_paths)
  VALUES (p_listing_id, auth.uid(), p_media_id, v_paths) RETURNING id INTO v_cleanup_task_id;
  DELETE FROM vehicle.profile_media WHERE id = media_record.id;
  RETURN QUERY SELECT media_record.original_path, media_record.storage_path, media_record.large_path, media_record.card_path, media_record.thumb_path;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_own_pending_listing_media_cleanup_task(p_listing_id uuid, p_media_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_catalog AS $$
  SELECT id FROM public.listing_media_cleanup_tasks
  WHERE listing_id = p_listing_id AND media_id = p_media_id AND seller_id = auth.uid() AND status = 'pending'
  ORDER BY created_at DESC LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_own_listing_media_cleanup_task(p_listing_id uuid, p_cleanup_task_id uuid)
RETURNS TABLE(storage_paths text[])
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  UPDATE public.listing_media_cleanup_tasks SET attempts = attempts + 1, last_attempt_at = now()
  WHERE id = p_cleanup_task_id AND listing_id = p_listing_id AND seller_id = auth.uid() AND status = 'pending'
  RETURNING listing_media_cleanup_tasks.storage_paths INTO storage_paths;
  IF NOT FOUND THEN RAISE EXCEPTION 'cleanup task not found' USING ERRCODE = 'OT404'; END IF;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_own_listing_media_cleanup_task(p_listing_id uuid, p_cleanup_task_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required' USING ERRCODE = 'OT401'; END IF;
  UPDATE public.listing_media_cleanup_tasks SET status = 'completed', completed_at = now()
  WHERE id = p_cleanup_task_id AND listing_id = p_listing_id AND seller_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'cleanup task not found' USING ERRCODE = 'OT404'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.remove_own_listing_media(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_own_pending_listing_media_cleanup_task(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_own_listing_media_cleanup_task(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.complete_own_listing_media_cleanup_task(uuid, uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.remove_own_listing_media(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_pending_listing_media_cleanup_task(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_own_listing_media_cleanup_task(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_own_listing_media_cleanup_task(uuid, uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
