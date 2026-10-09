# AGENTS.md — JOLCAR AUTONOMOUS CODEX RULES

These instructions are mandatory for autonomous Codex work on Jolcar.

Safety, correctness, privacy, database integrity and Git integrity override speed.

## 1. Source of truth

Read, in this order when relevant:
1. `MASTER_PLAN.md`
2. `TASK_QUEUE.json`
3. `DECISIONS.md`
4. current repository `AGENTS.md` / project skills if present
5. relevant current project documentation
6. current Git/migrations/tests

Current Git and verified tests override stale prose about implementation status.

Product decisions in `DECISIONS.md` and the user's latest explicit instructions override older proposals.

Do not silently change an approved product or architecture decision.

## 2. One task per run

Each Codex execution must:
1. identify exactly one runnable task from `TASK_QUEUE.json`;
2. verify dependencies;
3. execute only that task;
4. verify it;
5. commit only if the task passes and made intended repository changes;
6. stop.

A task is runnable only when:
- all dependencies have verified PASS evidence;
- it is not `awaiting_decision`;
- it is not `manual_authorization`;
- required local tools are available;
- worktree safety conditions are satisfied.

Do not begin the next product task in the same run.

## 3. Never invent scope

Do not add features merely because they are common marketplace features.

Forbidden unless later approved:
- buyer-seller payments;
- escrow;
- transaction settlement;
- vehicle reservation payment flow;
- seller/dealer star ratings;
- seller/dealer public reviews;
- dealer accounting/payroll/full ERP;
- full telephony;
- speculative social mechanics not listed in the plan.

If an unresolved decision is required, return `BLOCKED_DECISION`.

Do not guess.

## 4. Production and external actions are forbidden by default

Without explicit user authorization for the exact action, do not:
- access or mutate production Supabase;
- apply remote migrations;
- create/change production projects;
- deploy;
- push Git;
- modify DNS;
- connect/modify production domain settings;
- create/change real provider secrets;
- send real SMS/OTP;
- enable paid AI calls;
- enable paid live-streaming calls;
- perform real payments;
- use production users/listings.

If a task reaches a remote/production step, stop with `MANUAL_AUTH_REQUIRED`.

## 5. Secrets

Never print or commit:
- service-role keys;
- access tokens;
- refresh tokens;
- passwords;
- OTPs;
- JWTs;
- provider API keys;
- private keys;
- secret connection strings;
- browser auth state.

Use redacted labels in reports.

Test credentials must be synthetic, local, ephemeral and cleaned.

## 6. Git safety

Before changes:
- run `git status --short`;
- inspect current branch and HEAD;
- require a clean worktree unless the orchestrator explicitly identifies expected prior-task work.

Never:
- force-push;
- push;
- rebase;
- destructively reset;
- squash;
- amend an existing commit;
- rewrite shared history;
- delete branches/stashes;
- discard unrelated user work.

One successful logical task → one ordinary focused commit.

Do not include temporary config or unrelated files in commits.

After commit:
- inspect commit content;
- verify `git status --short` is clean.

If a run fails after safe code changes, preserve useful work only if the orchestrator protocol explicitly supports continuation; always restore temporary config/credential artifacts.

## 7. Database and migrations

Default rules:
- additive/forward-only;
- inspect current schema, existing migrations, RLS and constraints first;
- do not edit an applied historical migration;
- do not run production reset;
- do not drop/truncate valuable data;
- no destructive SQL without explicit approval;
- remote migration apply is forbidden.

A local migration task must verify:
- SQL syntax;
- privileges;
- RLS impact;
- anonymous/authenticated/owner/non-owner/admin paths where relevant;
- backward compatibility;
- migration ordering;
- available static/runtime migration checks.

If a new migration unexpectedly becomes necessary in a task that forbids migrations, stop and report.

## 8. Authorization and privacy

Never trust caller-supplied ownership identity when actor identity can be derived from the authenticated session.

Prefer:
- `auth.uid()` / server-derived identity;
- owner-scoped RPCs;
- RLS;
- minimal public facades;
- explicit request validation.

For sensitive changes verify, as relevant:
- anonymous;
- authenticated owner;
- authenticated non-owner;
- other seller/dealer;
- admin;
- service behavior only in server/test setup.

Public responses must not expose private seller:
- phone;
- auth UUID;
- private user UUID;
- seller contact IDs;
- verified contact list;
- verification source;
- account-phone metadata.

## 9. Multi-country discipline

Jolcar is Kazakhstan-first, not Kazakhstan-hardcoded core.

Do not place country-specific rules in shared business logic when they belong in country configuration.

Country-specific values include, where relevant:
- brand/domain;
- locales;
- currency;
- formatting;
- phone policy;
- cities/geo;
- legal copy;
- regulatory provider;
- dealer verification;
- SEO metadata.

Shared domain contracts must remain reusable for future YOLMOD Turkey and other countries.

If YOLMOD code hardcodes Turkey assumptions, isolate them instead of duplicating the subsystem.

## 10. Authentication / OTP economy

Approved behavior:
- first registration: phone OTP once, then password enrollment;
- routine login: phone + password, zero SMS;
- OTP only for registration, recovery, phone change/new contact and truly sensitive actions;
- no automatic resend;
- verified seller contacts are reusable;
- listing create/edit must not resend OTP for an already verified contact.

Do not reintroduce OTP-only routine login.

## 11. Testing strategy

Prefer the smallest test set that proves the change.

Order:
1. focused regression/contract test;
2. typecheck/static validation;
3. relevant integration/runtime test;
4. security/privacy matrix when boundaries changed;
5. broader suite when shared/core behavior changed.

Do not repeatedly run unchanged expensive suites without reason.

Do not declare PASS if a required verification was skipped.

If a test cannot run, report the exact gap.

## 12. Local Supabase on Windows

Historical YOLMOD local development encountered Windows reservations in `54300–54399`.

If the current machine has the same issue:
- do not modify Windows reserved ports;
- use an approved temporary free-port remap;
- discover runtime values dynamically with `npx supabase status -o env`;
- do not hardcode temporary ports in app/test source;
- restore `supabase/config.toml` exactly before completion;
- never commit temporary port remaps.

Do not assume the workaround is necessary; verify current state first.

## 13. UI/product requirements

Respect confirmed UX decisions:
- guest-first;
- mobile-first;
- restrained palette;
- stable card grid;
- one consistent allowed image ratio;
- body text target from 16px;
- tap target target >=44x44px;
- functional short microanimations;
- saved-search/live-count/search simplification;
- seller/dealer analytics;
- no visible dead-end CTA;
- dark mode is bonus, not a blocker.

Do not choose a final brand accent or card ratio if still unresolved.

## 14. Dealer rules

Dealer Social, Live, bulk import, lightweight CRM and analytics are approved.

Do not turn lightweight CRM into:
- accounting;
- payroll;
- full ERP;
- full telephony;
- document management.

Live transport must use a specialized provider abstraction. Do not stream raw live video through Supabase/Vercel.

Exact provider remains a user decision.

## 15. AI rules

AI may call only typed, allow-listed tools with validated minimal outputs.

Never expose:
- arbitrary SQL;
- arbitrary RPC names;
- Supabase client/service role;
- private seller contact;
- private saved-search data without an explicit owner-safe contract;
- unrestricted URL fetch;
- private VIN data without an approved owner-consented tool.

External provider activation/secrets require explicit approval.

## 16. Task completion evidence

A task can be PASS only with concrete evidence.

For mutation tasks record:
- task ID;
- starting HEAD;
- ending HEAD;
- commit SHA;
- changed files;
- tests executed;
- tests passed;
- migration status;
- `production_accessed: false`;
- `deploy_performed: false`;
- `push_performed: false`;
- `secrets_changed: false`;
- final worktree clean.

For read-only audits record:
- exact scope;
- findings;
- evidence paths;
- tests/commands run;
- no false completion claims.

## 17. Status protocol

Use one of:
- `PASS`
- `FAIL`
- `BLOCKED`
- `BLOCKED_DECISION`
- `MANUAL_AUTH_REQUIRED`

`PASS` = acceptance criteria verified.

`FAIL` = real defect/contract failure.

`BLOCKED` = environment/tooling prevented proof.

`BLOCKED_DECISION` = product/provider/business decision missing.

`MANUAL_AUTH_REQUIRED` = next action would violate local-only/no-secrets/no-deploy policy.

## 18. Recommended final report

Return compact machine-readable JSON, for example:

```json
{
  "task_id": "JLC-0403",
  "status": "PASS",
  "starting_head": "<sha>",
  "ending_head": "<sha>",
  "commit": "<sha-or-null>",
  "tests": [{"name": "typecheck", "status": "PASS"}],
  "acceptance": [{"criterion": "Live result count uses canonical search contract", "status": "PASS"}],
  "production_accessed": false,
  "remote_migration_applied": false,
  "deploy_performed": false,
  "push_performed": false,
  "secrets_changed": false,
  "worktree_clean": true,
  "stop_reason": null,
  "next_runnable_task": "JLC-0404"
}
```

Never include secret values or real personal data.

## 19. Decision-block handling

If a task is `awaiting_decision`, do not invent the answer.

An orchestrator may skip it only if:
- the next task does not depend on it;
- skipping cannot create an implicit architecture/product decision;
- the skip is recorded.

Otherwise stop and wait for the user.

## 20. Release claim prohibition

Do not claim:
- launch ready;
- production ready;
- GO LIVE;
- Jolcar complete

until final launch-gate tasks are verified and separately authorized production steps pass.

Local completion is not production completion.


## Autonomous local orchestrator mode

A continuous local orchestrator MAY launch multiple fresh Codex processes sequentially without waiting for the user, provided all rules below hold.

This does **not** change the one-task-per-Codex-process rule:
- one Codex process executes one TASK_QUEUE task only;
- after PASS, that process ends;
- the orchestrator may then start a fresh process for the next dependency-ready task.

The orchestrator may continue automatically through local tasks when:
- all task dependencies are verified PASS;
- the task does not require user authorization;
- the task does not require an unresolved user decision;
- the previous task is integrated cleanly;
- production/remote actions remain disabled.

For `requires_user_decision: true`:
- if the decision is already explicitly CONFIRMED in `DECISIONS.md`, use only that confirmed decision;
- otherwise do not invent an answer;
- record the task as deferred and continue independent dependency-ready work.

For `requires_user_authorization: true`:
- never execute the protected action autonomously;
- record the task as deferred/manual and continue independent local work.

For an ordinary task failure:
- the orchestrator may launch up to three fresh repair attempts;
- diagnose the root cause from concrete evidence;
- do not broaden scope merely to force PASS;
- do not weaken security, validation, RLS, privacy, or migration safety;
- if still blocked, preserve evidence and continue only with independent tasks.

A failed task must never contaminate the integration worktree. Autonomous runners should use isolated task worktrees/branches or an equivalent isolation mechanism.

The autonomous run must stop when:
- there are no remaining dependency-ready local tasks;
- only decision/manual/production gates remain;
- a safety invariant is violated;
- the integration worktree is unexpectedly dirty;
- Git integrity cannot be verified.

The autonomous run may reach **LOCAL RELEASE CANDIDATE**, but it may never cross a production/manual authorization gate without a new explicit user instruction.
