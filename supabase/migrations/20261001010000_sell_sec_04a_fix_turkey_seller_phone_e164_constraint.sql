BEGIN;

-- SELL-SEC-04A corrective repair for the prior migration's escaped regex.
-- `[+]` is unambiguous in PostgreSQL POSIX regex and matches one literal plus.
ALTER TABLE identity.seller_phone_verifications
  DROP CONSTRAINT seller_phone_verifications_turkey_e164_chk;

ALTER TABLE identity.seller_phone_verifications
  ADD CONSTRAINT seller_phone_verifications_turkey_e164_chk
  CHECK (phone_e164 ~ '^[+]90[1-9][0-9]{9}$');

COMMIT;
