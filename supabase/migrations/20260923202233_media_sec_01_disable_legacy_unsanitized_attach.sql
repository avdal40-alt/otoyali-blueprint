BEGIN;
-- MEDIA-SEC-01 corrective hardening: attach_own_listing_media accepts the
-- legacy browser-controlled path contract, so it cannot remain callable once
-- public delivery is sanitized-only. Existing rows remain unchanged.
REVOKE EXECUTE ON FUNCTION public.attach_own_listing_media(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,SMALLINT,BOOLEAN,INTEGER,INTEGER,NUMERIC,TEXT,BIGINT,TEXT) FROM authenticated;
COMMENT ON FUNCTION public.attach_own_listing_media(UUID,UUID,TEXT,TEXT,TEXT,TEXT,TEXT,SMALLINT,BOOLEAN,INTEGER,INTEGER,NUMERIC,TEXT,BIGINT,TEXT) IS 'Deprecated by MEDIA-SEC-01. Execute is revoked because browser-provided legacy paths cannot establish sanitized-media trust.';
NOTIFY pgrst, 'reload schema';
COMMIT;
