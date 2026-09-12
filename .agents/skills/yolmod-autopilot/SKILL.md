---
name: yolmod-autopilot
description: "Execute approved autonomous Yolmod V1 roadmap stages with local safety gates. Use for V1 continuation and stage execution; excludes releases, main-branch changes, and unattended recovery."
---
# Yolmod autopilot

Use this skill only for the local Yolmod V1 development loop. First read `docs/autopilot/YOLMOD_V1_PRODUCT_SPEC.md`, `docs/autopilot/IMPLEMENTATION_ROADMAP_V1.md`, `docs/autopilot/AUTOPILOT_RULES.md`, and `docs/autopilot/AUTOPILOT_STATE.md`. Follow `AGENTS.md` and the relevant specialised repository skill: `yolmod-implementation`, `yolmod-bugfix-debugging`, `yolmod-frontend-ui`, `yolmod-api-contract`, `yolmod-database-migration`, `yolmod-security-auth-rls`, `yolmod-testing-regression`, or `yolmod-release-production`. Git state and completed checks are the source of truth.

Never rely on prior chat context. Rehydrate from repository sources and the durable contract for the current stage before stopping for missing context.

1. Run `scripts/autopilot/preflight.ps1 -RequireClean` and `safety-check.ps1`, compare their result with state, and stop if the tree is not clean, the recorded baseline is no longer valid, or a required local tool is unavailable.
2. Select exactly one small, unblocked item from the current roadmap or recorded state. Do not begin a second item in the same run.
3. Make the minimal change. For database, auth, access-control, or release work load the relevant Yolmod skill and satisfy its additional gates.
4. Run the relevant checks. For any migration, run `migration-check.ps1` and perform a human SQL/RLS/privilege review; its structural scan is a guardrail, not proof of migration safety.
5. Review the final diff for scope, contracts, security, RLS, migrations, and UX as applicable. Correct findings and rerun affected checks.
6. Update `docs/autopilot/AUTOPILOT_STATE.md` with factual status, checks, and the next unblocked small task. Commit only the explicitly named files for this stage using one ordinary conventional commit. Stop after three successful stages and run `checkpoint.ps1`.

Never reset history, amend/squash, force-push, rewrite an applied migration, reset/truncate/delete database data, expose secrets, or perform an unconfirmed remote action. Do not push, deploy, apply a migration, or use staging/production until its target identity, release path, and authority are explicitly confirmed. Stop and report a concrete blocker for unclear business logic, missing access, or a recurring failure.
