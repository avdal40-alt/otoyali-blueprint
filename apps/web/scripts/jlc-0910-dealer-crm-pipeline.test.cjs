const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261013114500_jlc0910_dealer_crm_pipeline.sql"), "utf8");
for (const token of ["dealer_lead_status", "'new', 'contacted', 'thinking', 'meeting', 'sold', 'lost'", "dealer_lead_notes", "dealer_lead_follow_ups", "dealer_lead_history", "update_dealer_lead", "add_dealer_lead_note", "schedule_dealer_lead_follow_up", "complete_dealer_lead_follow_up", "only owner or manager may assign other team members"]) assert.ok(migration.includes(token), `missing ${token}`);
assert.doesNotMatch(migration, /^(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE)\b/im);

const docker = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...docker, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["dealer", "manager", "staff", "outsider", "lead"].map((key) => [key, randomUUID()]));
const role = (sub) => `RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '{"role":"authenticated","sub":"${sub}"}';`;
const anon = `RESET ROLE; SET LOCAL ROLE anon; SET LOCAL request.jwt.claims TO '{"role":"anon"}';`;
const sql = `BEGIN;
CREATE TEMP TABLE results (name TEXT PRIMARY KEY, ok BOOLEAN NOT NULL) ON COMMIT DROP;
GRANT SELECT, INSERT ON results TO authenticated, anon;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('00000000-0000-0000-0000-000000000000','${ids.dealer}','authenticated','authenticated','dealer-${ids.dealer}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.manager}','authenticated','authenticated','manager-${ids.manager}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.staff}','authenticated','authenticated','staff-${ids.staff}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.outsider}','authenticated','authenticated','outsider-${ids.outsider}@test.invalid','{}','{}',now(),now());
UPDATE public.profiles SET seller_type='dealer' WHERE id='${ids.dealer}';
INSERT INTO marketplace.dealer_staff_memberships(dealer_id,user_id,role) VALUES ('${ids.dealer}','${ids.manager}','manager'),('${ids.dealer}','${ids.staff}','staff');
INSERT INTO marketplace.dealer_leads(id,dealer_id,source,source_record_id) VALUES ('${ids.lead}','${ids.dealer}','dealer_post','${randomUUID()}');
${role(ids.dealer)}
SELECT (marketplace.update_dealer_lead('${ids.lead}','contacted','${ids.manager}',true)).status INTO TEMP TABLE updated;
INSERT INTO results VALUES ('owner assigns manager and updates status',(SELECT status='contacted' FROM updated) AND (SELECT manager_id='${ids.manager}' FROM marketplace.dealer_leads WHERE id='${ids.lead}'));
SELECT (marketplace.add_dealer_lead_note('${ids.lead}','Called customer')).id INTO TEMP TABLE note;
SELECT (marketplace.schedule_dealer_lead_follow_up('${ids.lead}',now() + interval '1 hour','Call again','${ids.manager}')).id INTO TEMP TABLE follow_up;
INSERT INTO results VALUES ('owner adds private note and manager reminder',(SELECT count(*)=1 FROM note) AND (SELECT count(*)=1 FROM follow_up));
${role(ids.staff)}
SELECT (marketplace.update_dealer_lead('${ids.lead}','thinking','${ids.staff}',true)).manager_id INTO TEMP TABLE self_assign;
INSERT INTO results VALUES ('staff may claim own assignment',(SELECT manager_id='${ids.staff}' FROM self_assign));
DO $$ BEGIN BEGIN PERFORM marketplace.update_dealer_lead('${ids.lead}',NULL,'${ids.manager}',true); INSERT INTO results VALUES ('staff cannot assign another member',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES ('staff cannot assign another member',true); END; END $$;
DO $$ BEGIN BEGIN PERFORM marketplace.complete_dealer_lead_follow_up((SELECT id FROM follow_up)); INSERT INTO results VALUES ('non-assigned staff cannot complete reminder',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES ('non-assigned staff cannot complete reminder',true); END; END $$;
${role(ids.manager)}
SELECT marketplace.complete_dealer_lead_follow_up((SELECT id FROM follow_up));
INSERT INTO results VALUES ('manager completes reminder',(SELECT completed_at IS NOT NULL AND completed_by='${ids.manager}' FROM marketplace.dealer_lead_follow_ups WHERE id=(SELECT id FROM follow_up)));
INSERT INTO results VALUES ('team sees notes, reminders, and history',(SELECT count(*)=1 FROM marketplace.dealer_lead_notes WHERE lead_id='${ids.lead}') AND (SELECT count(*)=1 FROM marketplace.dealer_lead_follow_ups WHERE lead_id='${ids.lead}') AND (SELECT count(*)>=5 FROM marketplace.dealer_lead_history WHERE lead_id='${ids.lead}'));
${role(ids.outsider)}
INSERT INTO results VALUES ('outsider sees no private CRM records',(SELECT count(*)=0 FROM marketplace.dealer_leads WHERE id='${ids.lead}') AND (SELECT count(*)=0 FROM marketplace.dealer_lead_notes WHERE lead_id='${ids.lead}') AND (SELECT count(*)=0 FROM marketplace.dealer_lead_follow_ups WHERE lead_id='${ids.lead}') AND (SELECT count(*)=0 FROM marketplace.dealer_lead_history WHERE lead_id='${ids.lead}'));
INSERT INTO results VALUES ('team helper cannot be spoofed by outsider',NOT marketplace.dealer_lead_team_access('${ids.dealer}','${ids.dealer}'));
DO $$ BEGIN BEGIN PERFORM marketplace.add_dealer_lead_note('${ids.lead}','probe'); INSERT INTO results VALUES ('outsider write denied',false); EXCEPTION WHEN SQLSTATE 'OT403' THEN INSERT INTO results VALUES ('outsider write denied',true); END; END $$;
${anon}
DO $$ BEGIN BEGIN PERFORM marketplace.add_dealer_lead_note('${ids.lead}','probe'); INSERT INTO results VALUES ('anon write denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anon write denied',true); END; END $$;
RESET ROLE;
INSERT INTO results VALUES ('direct table writes are denied',NOT has_table_privilege('anon','marketplace.dealer_lead_notes','INSERT') AND NOT has_table_privilege('authenticated','marketplace.dealer_lead_notes','INSERT') AND NOT has_table_privilege('authenticated','marketplace.dealer_lead_follow_ups','UPDATE') AND NOT has_table_privilege('authenticated','marketplace.dealer_lead_history','INSERT'));
SELECT name,ok FROM results ORDER BY name;
ROLLBACK;`;
const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`JLC-0910 CRM pipeline/security matrix passed (${rows.length} checks)`);
