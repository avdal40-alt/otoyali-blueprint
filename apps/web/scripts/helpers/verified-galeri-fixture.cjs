const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const { createLocalClient } = require("./local-auth-http-fixture.cjs");

const database = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const rows = (sql) => execFileSync("docker", [...database, sql], { encoding: "utf8" }).trim().split(/\r?\n/).filter(Boolean);

function cleanup(ids) {
  const all = Object.values(ids).map((id) => `'${id}'`).join(",");
  rows(`
    DELETE FROM public.admin_audit_logs
    WHERE entity_type = 'galeri_verification' AND entity_id = '${ids.dealer}'
       OR actor_user_id IN (${all});
    DELETE FROM marketplace.galeri_verification_transitions WHERE dealer_id = '${ids.dealer}';
    DELETE FROM marketplace.galeri_verifications WHERE dealer_id = '${ids.dealer}';
    DELETE FROM public.admin_users WHERE user_id = '${ids.reviewer}';
    DELETE FROM identity.audit_logs WHERE resource_id IN (${all}) OR user_id IN (${all});
    DELETE FROM auth.users WHERE id IN (${all});
  `);

  const residual = rows(`
    SELECT 'auth.users', count(*) FROM auth.users WHERE id IN (${all})
    UNION ALL SELECT 'public.profiles', count(*) FROM public.profiles WHERE id IN (${all})
    UNION ALL SELECT 'identity.user_settings', count(*) FROM identity.user_settings WHERE user_id IN (${all})
    UNION ALL SELECT 'identity.notification_preferences', count(*) FROM identity.notification_preferences WHERE user_id IN (${all})
    UNION ALL SELECT 'identity.user_roles', count(*) FROM identity.user_roles WHERE user_id IN (${all})
    UNION ALL SELECT 'identity.audit_logs', count(*) FROM identity.audit_logs WHERE resource_id IN (${all}) OR user_id IN (${all})
    UNION ALL SELECT 'public.admin_users', count(*) FROM public.admin_users WHERE user_id IN (${all})
    UNION ALL SELECT 'public.admin_audit_logs', count(*) FROM public.admin_audit_logs WHERE entity_id = '${ids.dealer}' OR actor_user_id IN (${all})
    UNION ALL SELECT 'marketplace.galeri_verifications', count(*) FROM marketplace.galeri_verifications WHERE dealer_id = '${ids.dealer}'
    UNION ALL SELECT 'marketplace.galeri_verification_transitions', count(*) FROM marketplace.galeri_verification_transitions WHERE dealer_id = '${ids.dealer}';
  `);
  assert.deepEqual(residual.sort(), residual.map((line) => line.replace(/\|\d+$/, "|0")).sort(), `fixture cleanup left rows: ${residual.join(", ")}`);
}

async function createVerifiedGaleriFixture() {
  const ids = { dealer: randomUUID(), reviewer: randomUUID(), normal: randomUUID() };
  rows(`
    INSERT INTO auth.users (instance_id, id, aud, role, email, email_confirmed_at, confirmation_token, recovery_token, email_change_token_new, email_change, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at)
    VALUES
      ('00000000-0000-0000-0000-000000000000', '${ids.dealer}', 'authenticated', 'authenticated', 'galeri-${ids.dealer}@example.test', now(), '', '', '', '', '{}', '{}', false, now(), now()),
      ('00000000-0000-0000-0000-000000000000', '${ids.reviewer}', 'authenticated', 'authenticated', 'galeri-${ids.reviewer}@example.test', now(), '', '', '', '', '{}', '{}', false, now(), now()),
      ('00000000-0000-0000-0000-000000000000', '${ids.normal}', 'authenticated', 'authenticated', 'galeri-${ids.normal}@example.test', now(), '', '', '', '', '{}', '{}', false, now(), now());
    UPDATE public.profiles SET seller_type = 'dealer' WHERE id = '${ids.dealer}';
    INSERT INTO public.admin_users (user_id, role, is_active) VALUES ('${ids.reviewer}', 'moderator', true);
  `);

  const dealer = createLocalClient("authenticated", ids.dealer, "marketplace").client;
  const reviewer = createLocalClient("authenticated", ids.reviewer, "marketplace").client;
  const normal = createLocalClient("authenticated", ids.normal).client;

  try {
    const submitted = await dealer.rpc("submit_galeri_verification", { p_evidence_metadata: {} });
    assert.ifError(submitted.error);
    assert.equal(submitted.data, "pending");

    const reviewed = await reviewer.rpc("review_galeri_verification", {
      p_dealer_id: ids.dealer,
      p_next_status: "verified",
      p_review_note: "local test fixture",
    });
    assert.ifError(reviewed.error);
    assert.equal(reviewed.data, "verified");

    return { ids, normal, verified: createLocalClient("authenticated", ids.dealer).client, accessToken: createLocalClient("authenticated", ids.dealer).accessToken, cleanup: () => cleanup(ids) };
  } catch (error) {
    cleanup(ids);
    throw error;
  }
}

module.exports = { createVerifiedGaleriFixture };
