BEGIN;

-- JLC-0910 keeps CRM workflow records private to a dealer team.  Direct table
-- writes remain service-role-only; authenticated users use the guarded RPCs.
CREATE TYPE marketplace.dealer_lead_status AS ENUM (
  'new', 'contacted', 'thinking', 'meeting', 'sold', 'lost'
);

ALTER TABLE marketplace.dealer_leads
  ADD COLUMN status marketplace.dealer_lead_status NOT NULL DEFAULT 'new';

CREATE INDEX dealer_leads_dealer_status_created_idx
  ON marketplace.dealer_leads (dealer_id, status, created_at DESC, id DESC);

CREATE TABLE marketplace.dealer_lead_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES marketplace.dealer_leads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 4000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX dealer_lead_notes_lead_created_idx
  ON marketplace.dealer_lead_notes (lead_id, created_at ASC, id ASC);

CREATE TABLE marketplace.dealer_lead_follow_ups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES marketplace.dealer_leads(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  due_at TIMESTAMPTZ NOT NULL,
  body TEXT NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 1000),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dealer_lead_follow_ups_completion_chk CHECK (
    (completed_at IS NULL AND completed_by IS NULL) OR (completed_at IS NOT NULL AND completed_by IS NOT NULL)
  )
);
CREATE INDEX dealer_lead_follow_ups_open_assignee_due_idx
  ON marketplace.dealer_lead_follow_ups (assigned_to, due_at ASC, id ASC)
  WHERE completed_at IS NULL;

CREATE TABLE marketplace.dealer_lead_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES marketplace.dealer_leads(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'status_changed', 'manager_assigned', 'manager_cleared', 'note_added', 'follow_up_scheduled', 'follow_up_completed'
  )),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX dealer_lead_history_lead_created_idx
  ON marketplace.dealer_lead_history (lead_id, created_at ASC, id ASC);

CREATE OR REPLACE FUNCTION marketplace.dealer_lead_team_access(p_dealer_id UUID, p_actor_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
  SELECT p_actor_id = auth.uid()
    AND (p_actor_id = p_dealer_id OR marketplace.is_dealer_staff_member(p_dealer_id, p_actor_id));
$$;

CREATE OR REPLACE FUNCTION marketplace.dealer_lead_can_manage_assignments(p_dealer_id UUID, p_actor_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
  SELECT p_actor_id = p_dealer_id
    OR marketplace.dealer_staff_role_for(p_dealer_id, p_actor_id) = 'manager'::marketplace.dealer_staff_role;
$$;

CREATE OR REPLACE FUNCTION marketplace.update_dealer_lead(
  p_lead_id UUID,
  p_status marketplace.dealer_lead_status DEFAULT NULL,
  p_manager_id UUID DEFAULT NULL,
  p_set_manager BOOLEAN DEFAULT FALSE
)
RETURNS marketplace.dealer_leads
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_lead marketplace.dealer_leads;
  v_previous_status marketplace.dealer_lead_status;
  v_previous_manager UUID;
BEGIN
  SELECT * INTO v_lead FROM marketplace.dealer_leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND OR v_actor IS NULL OR NOT marketplace.dealer_lead_team_access(v_lead.dealer_id, v_actor) THEN
    RAISE EXCEPTION 'dealer team access required' USING ERRCODE = 'OT403';
  END IF;

  v_previous_status := v_lead.status;
  v_previous_manager := v_lead.manager_id;
  IF p_status IS NOT NULL THEN v_lead.status := p_status; END IF;
  IF p_set_manager THEN
    IF NOT marketplace.dealer_lead_can_manage_assignments(v_lead.dealer_id, v_actor)
       AND p_manager_id IS DISTINCT FROM v_actor THEN
      RAISE EXCEPTION 'only owner or manager may assign other team members' USING ERRCODE = 'OT403';
    END IF;
    IF p_manager_id IS NOT NULL AND p_manager_id <> v_lead.dealer_id AND NOT EXISTS (
      SELECT 1 FROM marketplace.dealer_staff_memberships
      WHERE dealer_id = v_lead.dealer_id AND user_id = p_manager_id
    ) THEN RAISE EXCEPTION 'lead manager must belong to dealer' USING ERRCODE = 'OT422'; END IF;
    v_lead.manager_id := p_manager_id;
  END IF;

  UPDATE marketplace.dealer_leads SET status = v_lead.status, manager_id = v_lead.manager_id WHERE id = v_lead.id
  RETURNING * INTO v_lead;
  IF v_previous_status IS DISTINCT FROM v_lead.status THEN
    INSERT INTO marketplace.dealer_lead_history(lead_id, actor_id, event_type, details)
    VALUES (v_lead.id, v_actor, 'status_changed', jsonb_build_object('from', v_previous_status, 'to', v_lead.status));
  END IF;
  IF v_previous_manager IS DISTINCT FROM v_lead.manager_id THEN
    INSERT INTO marketplace.dealer_lead_history(lead_id, actor_id, event_type, details)
    VALUES (v_lead.id, v_actor, CASE WHEN v_lead.manager_id IS NULL THEN 'manager_cleared' ELSE 'manager_assigned' END,
      jsonb_build_object('from', v_previous_manager, 'to', v_lead.manager_id));
  END IF;
  RETURN v_lead;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.add_dealer_lead_note(p_lead_id UUID, p_body TEXT)
RETURNS marketplace.dealer_lead_notes
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE v_actor UUID := auth.uid(); v_lead marketplace.dealer_leads; v_note marketplace.dealer_lead_notes;
BEGIN
  SELECT * INTO v_lead FROM marketplace.dealer_leads WHERE id = p_lead_id;
  IF NOT FOUND OR v_actor IS NULL OR NOT marketplace.dealer_lead_team_access(v_lead.dealer_id, v_actor) THEN
    RAISE EXCEPTION 'dealer team access required' USING ERRCODE = 'OT403';
  END IF;
  INSERT INTO marketplace.dealer_lead_notes(lead_id, author_id, body) VALUES (p_lead_id, v_actor, p_body) RETURNING * INTO v_note;
  INSERT INTO marketplace.dealer_lead_history(lead_id, actor_id, event_type, details)
  VALUES (p_lead_id, v_actor, 'note_added', jsonb_build_object('note_id', v_note.id));
  RETURN v_note;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.schedule_dealer_lead_follow_up(p_lead_id UUID, p_due_at TIMESTAMPTZ, p_body TEXT, p_assigned_to UUID DEFAULT NULL)
RETURNS marketplace.dealer_lead_follow_ups
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE v_actor UUID := auth.uid(); v_lead marketplace.dealer_leads; v_assignee UUID := COALESCE(p_assigned_to, v_actor); v_follow_up marketplace.dealer_lead_follow_ups;
BEGIN
  SELECT * INTO v_lead FROM marketplace.dealer_leads WHERE id = p_lead_id;
  IF NOT FOUND OR v_actor IS NULL OR NOT marketplace.dealer_lead_team_access(v_lead.dealer_id, v_actor) THEN
    RAISE EXCEPTION 'dealer team access required' USING ERRCODE = 'OT403';
  END IF;
  IF NOT marketplace.dealer_lead_can_manage_assignments(v_lead.dealer_id, v_actor) AND v_assignee <> v_actor THEN
    RAISE EXCEPTION 'only owner or manager may assign other team members' USING ERRCODE = 'OT403';
  END IF;
  IF v_assignee <> v_lead.dealer_id AND NOT EXISTS (SELECT 1 FROM marketplace.dealer_staff_memberships WHERE dealer_id = v_lead.dealer_id AND user_id = v_assignee) THEN
    RAISE EXCEPTION 'follow-up assignee must belong to dealer' USING ERRCODE = 'OT422';
  END IF;
  INSERT INTO marketplace.dealer_lead_follow_ups(lead_id, assigned_to, due_at, body, created_by)
  VALUES (p_lead_id, v_assignee, p_due_at, p_body, v_actor) RETURNING * INTO v_follow_up;
  INSERT INTO marketplace.dealer_lead_history(lead_id, actor_id, event_type, details)
  VALUES (p_lead_id, v_actor, 'follow_up_scheduled', jsonb_build_object('follow_up_id', v_follow_up.id, 'assigned_to', v_assignee));
  RETURN v_follow_up;
END;
$$;

CREATE OR REPLACE FUNCTION marketplace.complete_dealer_lead_follow_up(p_follow_up_id UUID)
RETURNS marketplace.dealer_lead_follow_ups
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = marketplace, public, auth, pg_catalog
AS $$
DECLARE v_actor UUID := auth.uid(); v_follow_up marketplace.dealer_lead_follow_ups; v_dealer_id UUID; v_was_completed BOOLEAN;
BEGIN
  SELECT follow_up.* INTO v_follow_up
  FROM marketplace.dealer_lead_follow_ups follow_up JOIN marketplace.dealer_leads lead ON lead.id = follow_up.lead_id
  WHERE follow_up.id = p_follow_up_id FOR UPDATE OF follow_up;
  IF FOUND THEN
    SELECT dealer_id INTO v_dealer_id FROM marketplace.dealer_leads WHERE id = v_follow_up.lead_id;
  END IF;
  IF NOT FOUND OR v_actor IS NULL OR NOT marketplace.dealer_lead_team_access(v_dealer_id, v_actor) THEN
    RAISE EXCEPTION 'dealer team access required' USING ERRCODE = 'OT403';
  END IF;
  IF v_actor <> v_follow_up.assigned_to AND NOT marketplace.dealer_lead_can_manage_assignments(v_dealer_id, v_actor) THEN
    RAISE EXCEPTION 'only assignee, owner, or manager may complete follow-up' USING ERRCODE = 'OT403';
  END IF;
  v_was_completed := v_follow_up.completed_at IS NOT NULL;
  UPDATE marketplace.dealer_lead_follow_ups SET completed_at = COALESCE(completed_at, now()), completed_by = COALESCE(completed_by, v_actor)
  WHERE id = v_follow_up.id RETURNING * INTO v_follow_up;
  IF NOT v_was_completed THEN
    INSERT INTO marketplace.dealer_lead_history(lead_id, actor_id, event_type, details)
    VALUES (v_follow_up.lead_id, v_actor, 'follow_up_completed', jsonb_build_object('follow_up_id', v_follow_up.id));
  END IF;
  RETURN v_follow_up;
END;
$$;

ALTER TABLE marketplace.dealer_lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.dealer_lead_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.dealer_lead_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY dealer_lead_notes_select_team ON marketplace.dealer_lead_notes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM marketplace.dealer_leads lead WHERE lead.id = lead_id AND marketplace.dealer_lead_team_access(lead.dealer_id)));
CREATE POLICY dealer_lead_follow_ups_select_team ON marketplace.dealer_lead_follow_ups FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM marketplace.dealer_leads lead WHERE lead.id = lead_id AND marketplace.dealer_lead_team_access(lead.dealer_id)));
CREATE POLICY dealer_lead_history_select_team ON marketplace.dealer_lead_history FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM marketplace.dealer_leads lead WHERE lead.id = lead_id AND marketplace.dealer_lead_team_access(lead.dealer_id)));
CREATE POLICY dealer_lead_notes_service_role_all ON marketplace.dealer_lead_notes FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY dealer_lead_follow_ups_service_role_all ON marketplace.dealer_lead_follow_ups FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY dealer_lead_history_service_role_all ON marketplace.dealer_lead_history FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

REVOKE ALL ON TABLE marketplace.dealer_lead_notes, marketplace.dealer_lead_follow_ups, marketplace.dealer_lead_history FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE marketplace.dealer_lead_notes, marketplace.dealer_lead_follow_ups, marketplace.dealer_lead_history TO authenticated;
GRANT ALL ON TABLE marketplace.dealer_lead_notes, marketplace.dealer_lead_follow_ups, marketplace.dealer_lead_history TO service_role;
REVOKE ALL ON FUNCTION marketplace.dealer_lead_team_access(UUID, UUID), marketplace.dealer_lead_can_manage_assignments(UUID, UUID), marketplace.update_dealer_lead(UUID, marketplace.dealer_lead_status, UUID, BOOLEAN), marketplace.add_dealer_lead_note(UUID, TEXT), marketplace.schedule_dealer_lead_follow_up(UUID, TIMESTAMPTZ, TEXT, UUID), marketplace.complete_dealer_lead_follow_up(UUID) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION marketplace.dealer_lead_team_access(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION marketplace.update_dealer_lead(UUID, marketplace.dealer_lead_status, UUID, BOOLEAN), marketplace.add_dealer_lead_note(UUID, TEXT), marketplace.schedule_dealer_lead_follow_up(UUID, TIMESTAMPTZ, TEXT, UUID), marketplace.complete_dealer_lead_follow_up(UUID) TO authenticated;

COMMENT ON TABLE marketplace.dealer_lead_history IS 'Append-only private activity history for the lightweight dealer CRM; it excludes buyer contact details and message contents.';
NOTIFY pgrst, 'reload schema';
COMMIT;
