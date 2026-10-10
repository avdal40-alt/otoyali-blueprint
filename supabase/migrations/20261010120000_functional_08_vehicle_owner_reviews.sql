BEGIN;

CREATE TYPE vehicle.review_moderation_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE vehicle.review_ownership_status AS ENUM ('current_owner', 'former_owner');

ALTER TABLE vehicle.models
  ADD CONSTRAINT vehicle_models_id_make_unique UNIQUE (id, make_id);

CREATE TABLE vehicle.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES vehicle.models(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vehicle_generations_name_not_empty_chk CHECK (char_length(trim(name)) > 0),
  CONSTRAINT vehicle_generations_slug_format_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT vehicle_generations_model_slug_unique UNIQUE (model_id, slug),
  CONSTRAINT vehicle_generations_id_model_unique UNIQUE (id, model_id)
);

CREATE TABLE vehicle.modifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_id UUID NOT NULL REFERENCES vehicle.generations(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT vehicle_modifications_name_not_empty_chk CHECK (char_length(trim(name)) > 0),
  CONSTRAINT vehicle_modifications_slug_format_chk CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  CONSTRAINT vehicle_modifications_generation_slug_unique UNIQUE (generation_id, slug),
  CONSTRAINT vehicle_modifications_id_generation_unique UNIQUE (id, generation_id)
);

CREATE TABLE vehicle.owner_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  make_id UUID NOT NULL REFERENCES vehicle.makes(id) ON DELETE RESTRICT,
  model_id UUID NOT NULL REFERENCES vehicle.models(id) ON DELETE RESTRICT,
  generation_id UUID NOT NULL,
  modification_id UUID,
  ownership_status vehicle.review_ownership_status NOT NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  pros TEXT[] NOT NULL DEFAULT '{}',
  cons TEXT[] NOT NULL DEFAULT '{}',
  body TEXT,
  moderation_status vehicle.review_moderation_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT owner_reviews_generation_model_fk FOREIGN KEY (generation_id, model_id)
    REFERENCES vehicle.generations(id, model_id) ON DELETE RESTRICT,
  CONSTRAINT owner_reviews_model_make_fk FOREIGN KEY (model_id, make_id)
    REFERENCES vehicle.models(id, make_id) ON DELETE RESTRICT,
  CONSTRAINT owner_reviews_modification_generation_fk FOREIGN KEY (modification_id, generation_id)
    REFERENCES vehicle.modifications(id, generation_id) ON DELETE RESTRICT,
  CONSTRAINT owner_reviews_body_length_chk CHECK (body IS NULL OR char_length(trim(body)) BETWEEN 1 AND 5000),
  CONSTRAINT owner_reviews_pros_cons_items_chk CHECK (
    cardinality(pros) <= 10 AND cardinality(cons) <= 10
  )
);

CREATE INDEX vehicle_generations_model_active_name_idx ON vehicle.generations (model_id, is_active, name);
CREATE INDEX vehicle_modifications_generation_active_name_idx ON vehicle.modifications (generation_id, is_active, name);
CREATE INDEX vehicle_owner_reviews_public_target_idx ON vehicle.owner_reviews (make_id, model_id, generation_id)
  WHERE moderation_status = 'approved';
CREATE UNIQUE INDEX vehicle_owner_reviews_one_per_author_target_idx
  ON vehicle.owner_reviews (author_id, generation_id, COALESCE(modification_id, '00000000-0000-0000-0000-000000000000'::uuid));

ALTER TABLE vehicle.generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle.modifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle.owner_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY generations_select_active ON vehicle.generations FOR SELECT TO anon, authenticated USING (is_active AND EXISTS (SELECT 1 FROM vehicle.models m JOIN vehicle.makes b ON b.id = m.make_id WHERE m.id = generations.model_id AND m.is_active AND b.is_active));
CREATE POLICY modifications_select_active ON vehicle.modifications FOR SELECT TO anon, authenticated USING (is_active AND EXISTS (SELECT 1 FROM vehicle.generations g WHERE g.id = modifications.generation_id AND g.is_active));
CREATE POLICY owner_reviews_select_approved ON vehicle.owner_reviews FOR SELECT TO anon, authenticated USING (moderation_status = 'approved');
CREATE POLICY owner_reviews_select_own ON vehicle.owner_reviews FOR SELECT TO authenticated USING (author_id = auth.uid());
CREATE POLICY owner_reviews_insert_own ON vehicle.owner_reviews FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND moderation_status = 'pending');
CREATE POLICY owner_reviews_update_own_pending ON vehicle.owner_reviews FOR UPDATE TO authenticated USING (author_id = auth.uid() AND moderation_status = 'pending') WITH CHECK (author_id = auth.uid() AND moderation_status = 'pending');
CREATE POLICY generations_service_role_all ON vehicle.generations FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY modifications_service_role_all ON vehicle.modifications FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY owner_reviews_service_role_all ON vehicle.owner_reviews FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

GRANT SELECT ON vehicle.generations, vehicle.modifications TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON vehicle.owner_reviews TO authenticated;
GRANT ALL ON vehicle.generations, vehicle.modifications, vehicle.owner_reviews TO service_role;

COMMENT ON TABLE vehicle.owner_reviews IS 'Owner-authored vehicle experience reviews. This domain intentionally does not rate sellers or dealers.';
NOTIFY pgrst, 'reload schema';
COMMIT;
