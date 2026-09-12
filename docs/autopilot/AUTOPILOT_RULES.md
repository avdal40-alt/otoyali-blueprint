# Yolmod autopilot rules

## Mandatory loop

1. Read `AUTOPILOT_STATE.md`; verify branch, HEAD, and worktree with Git.
2. Read this roadmap and the V1 specification. Select one approved, unblocked small stage.
3. Inspect the actual current code and use relevant specialised Yolmod skills.
4. Implement only that stage and run targeted tests. Diagnose/fix safe failures, then rerun tests.
5. Review the diff explicitly for security; RLS/grants and migration where relevant; compatibility; privacy; and UX contract. Fix findings and rerun relevant tests.
6. Update state in the same commit; stage explicit reviewed files; make one ordinary commit; verify clean worktree; determine next stage.

Git/tests, not state prose, are the source of truth. Stop and reconcile a state/Git conflict rather than falsifying state. Record stage, command/error summary, changed files, last safe commit, and recommended human decision after repeated safe failure; never retry indefinitely.

## Multi-stage mode

Future autonomous runs may continue only after a clean successful commit, green mandatory gates, explicitly defined next stage, no unresolved business ambiguity, no production/destructive action, and no provider dependency gap. Maximum three successful implementation stages per run; then run `checkpoint.ps1`, write a summary, and stop.

## Hard manual production gate

Autopilot may prepare candidates, migrations, test evidence, release notes, and checklists. It must never merge or push `main`, mutate `origin/main`, apply production migration, promote Vercel production, change production secrets, roll back/restores, or alter production data. Push to a non-main branch is permitted only when that exact branch, deployment consequences, and non-production target are verified and all checks pass; otherwise record `PUSH BLOCKED`.

## Ambiguity and providers

Stop for unresolved privacy, contact visibility, payment, verification/trust, VIN obligation, lifecycle deletion/retention, permission, production, legal-consent, or major scope decisions. Do not configure paid/external providers during bootstrap; their absence blocks only dependent work.
