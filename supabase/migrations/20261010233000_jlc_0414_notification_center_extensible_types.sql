-- JLC-0414: make the private notification event contract extensible without
-- weakening owner-scoped access or the event-specific saved-search reference checks.
ALTER TABLE marketplace.notifications
  DROP CONSTRAINT notifications_type_check;

ALTER TABLE marketplace.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type ~ '^[a-z][a-z0-9_]{1,63}$');

COMMENT ON TABLE marketplace.notifications IS
  'Private owner-scoped in-app notification records. Event type is extensible; producers must expose only safe references through owner-derived facades.';
