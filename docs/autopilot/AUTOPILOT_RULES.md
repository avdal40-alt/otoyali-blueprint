# Yolmod autopilot rules

## Fresh-thread default

One fresh Codex thread equals one approved implementation stage equals one ordinary commit. A new run must be able to proceed from repository sources alone: Git, `AUTOPILOT_STATE.md`, the V1 Product Spec, this Roadmap, code/tests/migrations, durable contracts, and the relevant skill. Previous thread messages, remembered output, invisible session state, and unsupported automation/UI interaction are never inputs.

Fresh-thread mode exists for smaller context, less stale-instruction contamination, reproducible continuation, and easier review. It does not bypass account or Codex usage limits. A title such as `YOLMOD — FUNCTIONAL-02C1B3A2` is recommended for convenience, but must never be treated as state.

## Mandatory fresh-thread start loop

1. Locate the repository root and read `AGENTS.md`, the autopilot skill, Product Spec, Roadmap, Rules, and State.
2. Run `scripts/autopilot/preflight.ps1 -RequireClean` and `scripts/autopilot/safety-check.ps1`; reconcile State against branch, HEAD, clean worktree, and recent Git history before selecting work.
3. Inspect the previous-stage commit; confirm exactly one approved, unblocked next stage; inspect its durable contract and actual code; then load the relevant specialised skill.
4. Implement only that stage and run targeted tests. Diagnose/fix safe failures, then rerun tests.
5. Review the diff explicitly for security; RLS/grants and migration where relevant; compatibility; privacy; and UX contract. Fix findings and rerun relevant tests.
6. Update State in the same commit; stage explicit reviewed files; make one ordinary commit; verify the clean worktree; determine and report the next stage; stop the thread.

Git/tests, not state prose, are the source of truth. Stop and reconcile a state/Git conflict rather than falsifying state. Record stage, command/error summary, changed files, last safe commit, and recommended human decision after repeated safe failure; never retry indefinitely.

## State contract

State remains concise and must record: repository path; expected working branch; a Git-derived current reference; protected branches; last completed product stage and commit; next approved stage; current-stage status; latest mandatory checks; latest migration static and runtime results; push and production status; known blockers; unresolved external-provider decisions; and last-run timestamp. Link to commits/tests/contracts rather than copying large reports.

## Completion and blocked-run contract

Complete a product stage only when its Roadmap scope is implemented, required files and targeted tests pass, security/privacy and compatibility review is complete, relevant migration static validation passes, runtime database validation is explicitly recorded where applicable, the diff is reviewed, one ordinary commit exists, and the worktree is clean. When runtime validation is unavailable, record `RUNTIME_VALIDATION = BLOCKED / NOT_AVAILABLE`; do not call it a pass.

If a stage is blocked, do not make a false-success commit or start a different stage. State must preserve the exact blocker, failing command/test, affected files, last known safe commit, and the next fresh-thread action: `RETRY`, `AUDIT`, or `WAIT FOR HUMAN DECISION`.

## Fresh-thread end report

Every implementation thread ends and stops after its one stage with: `STAGE RESULT: PASS / STOP`; stage; starting/final HEAD; implemented scope; migration/runtime-validation result; tests; security review; State last-completed/next values; commit/worktree/push status; production access/mutation status; blockers; and the next fresh-thread stage.

## Hard manual production gate

Autopilot may prepare candidates, migrations, test evidence, release notes, and checklists. It must never merge or push `main`, mutate `origin/main`, apply production migration, promote Vercel production, change production secrets, roll back/restores, or alter production data. Push to a non-main branch is permitted only when that exact branch, deployment consequences, and non-production target are verified and all checks pass; otherwise record `PUSH BLOCKED`.

## Ambiguity and providers

Stop for unresolved privacy, contact visibility, payment, verification/trust, VIN obligation, lifecycle deletion/retention, permission, production, legal-consent, or major scope decisions. Do not configure paid/external providers during bootstrap; their absence blocks only dependent work.
