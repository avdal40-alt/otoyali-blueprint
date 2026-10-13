BEGIN;

-- Analytics events are emitted exclusively by trusted source-table triggers.
-- The original generic RPC remains for migration compatibility, but must not
-- provide a caller-controlled path to manufacture seller analytics events.
REVOKE ALL ON FUNCTION public.record_seller_analytics_event(UUID, TEXT, UUID)
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.record_seller_analytics_event(UUID, TEXT, UUID) IS
  'Deprecated private compatibility function. Canonical source-table triggers exclusively ingest typed seller analytics events; it is not executable by API roles.';

COMMIT;
