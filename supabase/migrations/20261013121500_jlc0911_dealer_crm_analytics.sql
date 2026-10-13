BEGIN;

-- JLC-0911: expose only aggregate CRM metrics for the dealer teams to which
-- the authenticated actor belongs. Lead notes, buyer data, and activity
-- details remain outside this read model.
CREATE OR REPLACE FUNCTION public.list_own_dealer_crm_analytics()
RETURNS TABLE (
  dealer_id UUID,
  metric TEXT,
  dimension TEXT,
  lead_count BIGINT,
  open_follow_up_count BIGINT,
  overdue_follow_up_count BIGINT
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
  WITH accessible_dealers AS (
    SELECT profile.id AS dealer_id
    FROM public.profiles AS profile
    WHERE profile.id = auth.uid() AND profile.seller_type = 'dealer'

    UNION

    SELECT membership.dealer_id
    FROM marketplace.dealer_staff_memberships AS membership
    WHERE membership.user_id = auth.uid()
  ),
  grouped_metrics AS (
    SELECT
      lead.dealer_id,
      'total'::TEXT AS metric,
      'all'::TEXT AS dimension,
      COUNT(DISTINCT lead.id)::BIGINT AS lead_count,
      COUNT(DISTINCT follow_up.id) FILTER (WHERE follow_up.completed_at IS NULL)::BIGINT AS open_follow_up_count,
      COUNT(DISTINCT follow_up.id) FILTER (WHERE follow_up.completed_at IS NULL AND follow_up.due_at < now())::BIGINT AS overdue_follow_up_count
    FROM marketplace.dealer_leads AS lead
    JOIN accessible_dealers AS dealer ON dealer.dealer_id = lead.dealer_id
    LEFT JOIN marketplace.dealer_lead_follow_ups AS follow_up ON follow_up.lead_id = lead.id
    GROUP BY lead.dealer_id

    UNION ALL

    SELECT
      lead.dealer_id,
      'funnel'::TEXT AS metric,
      lead.status::TEXT AS dimension,
      COUNT(DISTINCT lead.id)::BIGINT AS lead_count,
      COUNT(DISTINCT follow_up.id) FILTER (WHERE follow_up.completed_at IS NULL)::BIGINT AS open_follow_up_count,
      COUNT(DISTINCT follow_up.id) FILTER (WHERE follow_up.completed_at IS NULL AND follow_up.due_at < now())::BIGINT AS overdue_follow_up_count
    FROM marketplace.dealer_leads AS lead
    JOIN accessible_dealers AS dealer ON dealer.dealer_id = lead.dealer_id
    LEFT JOIN marketplace.dealer_lead_follow_ups AS follow_up ON follow_up.lead_id = lead.id
    GROUP BY lead.dealer_id, lead.status

    UNION ALL

    SELECT
      lead.dealer_id,
      'source'::TEXT AS metric,
      lead.source::TEXT AS dimension,
      COUNT(DISTINCT lead.id)::BIGINT AS lead_count,
      COUNT(DISTINCT follow_up.id) FILTER (WHERE follow_up.completed_at IS NULL)::BIGINT AS open_follow_up_count,
      COUNT(DISTINCT follow_up.id) FILTER (WHERE follow_up.completed_at IS NULL AND follow_up.due_at < now())::BIGINT AS overdue_follow_up_count
    FROM marketplace.dealer_leads AS lead
    JOIN accessible_dealers AS dealer ON dealer.dealer_id = lead.dealer_id
    LEFT JOIN marketplace.dealer_lead_follow_ups AS follow_up ON follow_up.lead_id = lead.id
    GROUP BY lead.dealer_id, lead.source

    UNION ALL

    SELECT
      lead.dealer_id,
      'manager'::TEXT AS metric,
      COALESCE(NULLIF(profile.display_name, ''), NULLIF(profile.full_name, ''), CASE WHEN lead.manager_id IS NULL THEN 'unassigned' ELSE 'Assigned manager' END) AS dimension,
      COUNT(DISTINCT lead.id)::BIGINT AS lead_count,
      COUNT(DISTINCT follow_up.id) FILTER (WHERE follow_up.completed_at IS NULL)::BIGINT AS open_follow_up_count,
      COUNT(DISTINCT follow_up.id) FILTER (WHERE follow_up.completed_at IS NULL AND follow_up.due_at < now())::BIGINT AS overdue_follow_up_count
    FROM marketplace.dealer_leads AS lead
    JOIN accessible_dealers AS dealer ON dealer.dealer_id = lead.dealer_id
    LEFT JOIN public.profiles AS profile ON profile.id = lead.manager_id
    LEFT JOIN marketplace.dealer_lead_follow_ups AS follow_up ON follow_up.lead_id = lead.id
    GROUP BY lead.dealer_id, lead.manager_id, profile.display_name, profile.full_name
  )
  SELECT * FROM grouped_metrics;
$$;

REVOKE ALL ON FUNCTION public.list_own_dealer_crm_analytics() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_own_dealer_crm_analytics() TO authenticated;

COMMENT ON FUNCTION public.list_own_dealer_crm_analytics() IS
  'Returns aggregate funnel, source, manager, and follow-up counts only for dealer teams containing the authenticated actor.';

NOTIFY pgrst, 'reload schema';
COMMIT;
