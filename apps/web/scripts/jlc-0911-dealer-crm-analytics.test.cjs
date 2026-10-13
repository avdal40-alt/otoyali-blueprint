const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const migration = fs.readFileSync(path.join(root, "supabase", "migrations", "20261013121500_jlc0911_dealer_crm_analytics.sql"), "utf8");
const dashboard = fs.readFileSync(path.join(root, "apps", "web", "src", "app", "profile", "dealer-crm", "_components", "DealerCrmAnalyticsClient.tsx"), "utf8");
for (const token of ["list_own_dealer_crm_analytics", "'funnel'", "'source'", "'manager'", "open_follow_up_count", "overdue_follow_up_count", "GRANT EXECUTE ON FUNCTION public.list_own_dealer_crm_analytics() TO authenticated"]) assert.ok(migration.includes(token), `missing ${token}`);
assert.doesNotMatch(migration, /^(?:DROP\s+(?:TABLE|SCHEMA|DATABASE)|TRUNCATE)\b/im);
assert.match(dashboard, /supabase\.rpc\("list_own_dealer_crm_analytics"\)/);
assert.match(dashboard, /grid-cols-2 gap-2 sm:grid-cols-4/);

const db = ["exec", "supabase_db_Otoyali-blueprint", "psql", "-q", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-Atc"];
const query = (sql) => execFileSync("docker", [...db, sql], { encoding: "utf8" }).trim();
const ids = Object.fromEntries(["dealer", "staff", "outsider", "lead", "otherLead"].map((key) => [key, randomUUID()]));
const role = (sub) => `RESET ROLE; SET LOCAL ROLE authenticated; SET LOCAL request.jwt.claims TO '{"role":"authenticated","sub":"${sub}"}';`;
const sql = `BEGIN;
CREATE TEMP TABLE results (name TEXT PRIMARY KEY, ok BOOLEAN NOT NULL) ON COMMIT DROP;
GRANT SELECT, INSERT ON results TO authenticated, anon;
INSERT INTO auth.users(instance_id,id,aud,role,email,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) VALUES
 ('00000000-0000-0000-0000-000000000000','${ids.dealer}','authenticated','authenticated','dealer-${ids.dealer}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.staff}','authenticated','authenticated','staff-${ids.staff}@test.invalid','{}','{}',now(),now()),
 ('00000000-0000-0000-0000-000000000000','${ids.outsider}','authenticated','authenticated','outsider-${ids.outsider}@test.invalid','{}','{}',now(),now());
UPDATE public.profiles SET seller_type='dealer' WHERE id='${ids.dealer}';
INSERT INTO marketplace.dealer_staff_memberships(dealer_id,user_id,role) VALUES ('${ids.dealer}','${ids.staff}','staff');
INSERT INTO marketplace.dealer_leads(id,dealer_id,source,source_record_id,status) VALUES
 ('${ids.lead}','${ids.dealer}','dealer_post','${randomUUID()}','meeting'),
 ('${ids.otherLead}','${ids.dealer}','dealer_post','${randomUUID()}','new');
INSERT INTO marketplace.dealer_lead_follow_ups(lead_id,assigned_to,due_at,body,created_by) VALUES ('${ids.lead}','${ids.staff}',now()-interval '1 hour','JLC 0911 overdue follow-up','${ids.dealer}');
${role(ids.dealer)}
INSERT INTO results VALUES ('owner sees total funnel source manager and overdue metrics', (SELECT count(DISTINCT metric)=4 FROM public.list_own_dealer_crm_analytics() WHERE dealer_id='${ids.dealer}') AND (SELECT lead_count=2 AND open_follow_up_count=1 AND overdue_follow_up_count=1 FROM public.list_own_dealer_crm_analytics() WHERE dealer_id='${ids.dealer}' AND metric='total'));
${role(ids.staff)}
INSERT INTO results VALUES ('staff sees own dealer analytics', (SELECT count(DISTINCT metric)=4 FROM public.list_own_dealer_crm_analytics() WHERE dealer_id='${ids.dealer}'));
${role(ids.outsider)}
INSERT INTO results VALUES ('outsider sees no dealer analytics', (SELECT count(*)=0 FROM public.list_own_dealer_crm_analytics()));
RESET ROLE; SET LOCAL ROLE anon; SET LOCAL request.jwt.claims TO '{"role":"anon"}';
DO $$ BEGIN BEGIN PERFORM public.list_own_dealer_crm_analytics(); INSERT INTO results VALUES ('anonymous execute denied',false); EXCEPTION WHEN insufficient_privilege THEN INSERT INTO results VALUES ('anonymous execute denied',true); END; END $$;
RESET ROLE;
SELECT name,ok FROM results ORDER BY name;
ROLLBACK;`;
const rows = query(sql).split(/\r?\n/).filter((line) => line.split("|").length === 2).map((line) => line.split("|"));
assert.deepEqual(rows.filter(([, ok]) => ok !== "t"), [], JSON.stringify(rows));
console.log(`JLC-0911 dealer CRM analytics/security matrix passed (${rows.length} checks)`);
