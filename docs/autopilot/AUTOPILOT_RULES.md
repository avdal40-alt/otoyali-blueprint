# Yolmod autopilot rules

## Interactive and continuous modes

Interactive manual mode may execute at most three approved, dependency-ordered implementation stages. Each stage equals one ordinary commit; multiple stages must never share a commit. Continuous supervised mode uses `scripts/autopilot/continuous.ps1`, which starts a fresh `codex exec` for exactly one stage at a time and may continue indefinitely while its independent gates pass. A new run and every continuation must proceed from repository sources alone: Git, `AUTOPILOT_STATE.md`, the V1 Product Spec, this Roadmap, code/tests/migrations, durable contracts, and the relevant skill. Previous thread messages, remembered output, invisible session state, and unsupported automation/UI interaction are never inputs.

Controlled runs preserve small, reproducible stages without treating a new thread as a mandatory boundary after every successful commit. They do not bypass account or Codex usage limits. A title such as `YOLMOD — FUNCTIONAL-02C1B3A2` is recommended for convenience, but must never be treated as state.

## Mandatory controlled-run loop

1. Locate the repository root and read `AGENTS.md`, the autopilot skill, Product Spec, Roadmap, Rules, and State.
2. Run `scripts/autopilot/preflight.ps1 -RequireClean` and `scripts/autopilot/safety-check.ps1`; reconcile State against branch, HEAD, clean worktree, and recent Git history before selecting work.
3. Inspect the previous-stage commit; confirm the next approved, unblocked stage; inspect its durable contract and actual code; then load the relevant specialised skill.
4. Implement only that stage and run targeted tests. Diagnose/fix safe failures, then rerun tests.
5. Review the diff explicitly for security; RLS/grants and migration where relevant; compatibility; privacy; and UX contract. Fix findings and rerun relevant tests.
6. Update State in the same commit; stage explicit reviewed files; make one ordinary commit; verify the clean worktree; determine and report the next stage.

## Continuation gate and checkpoint

After a successful stage commit, the run may continue only if all conditions hold: commit success, clean worktree, Git/State reconciliation, an explicitly named dependency-valid Roadmap stage, passed required tests, no required production action, no blocking provider decision, no unresolved business/product ambiguity, no open security/privacy issue, and no destructive migration requirement.

Before continuing, rerun `scripts/autopilot/preflight.ps1 -RequireClean` and `scripts/autopilot/safety-check.ps1`; inspect the just-created commit; and reconstruct the next stage from durable repository sources. If any condition fails, stop without inventing a next stage. Track the completed-stage count in State.

Interactive manual mode has a hard maximum of three successful product stages per run. After the third commit, run `scripts/autopilot/checkpoint.ps1` and stop; never begin a fourth stage. Continuous supervised mode treats every three successful stage commits as checkpoint cadence, not a stop condition: it runs the same checkpoint and continues only when it passes. It also checkpoints after a security/RLS/auth stage, a migration-heavy domain block, a Roadmap-requested checkpoint, or a major architecture/domain boundary. Do not run the full checkpoint after every small stage unless required. An earlier stop is permitted only for a concrete increased-risk stage, required provider/production action, external migration dependency, major domain boundary, or insufficient safe execution context; report that reason precisely.

## Continuous supervisor contract

`scripts/autopilot/continuous.ps1` is local-only and has no schedule dependency. It acquires a single conservative lock, checks `.autopilot-runtime/STOP`, performs preflight and Git/State/Roadmap checks, invokes one `codex exec` with `--sandbox workspace-write`, waits for the real process exit, verifies the machine-readable result against Git and State, re-runs declared targeted tests and safety checks, and then selects the next stage. It never pushes, deploys, accesses production, resets, discards interrupted work, or uses unsafe Codex bypass options.

If a Codex exit leaves product changes without a valid one-stage commit, the supervisor stops with `INTERRUPTED_STAGE_RECOVERY_REQUIRED`. If an existing lock belongs to a live process it stops with `SUPERVISOR_ALREADY_RUNNING`; a stale lock requires explicit human recovery. `STOP` is checked before each new stage and never interrupts Git operations. Transient process/service failures receive at most the configured bounded retries; ambiguous quota or authentication failure stops.

Continuous local operation requires the computer to remain powered on, awake (not sleeping or hibernating), network-connected, and authenticated with Codex. The supervisor never changes Windows power settings.

Git/tests, not state prose, are the source of truth. Stop and reconcile a state/Git conflict rather than falsifying state. Record stage, command/error summary, changed files, last safe commit, and recommended human decision after repeated safe failure; never retry indefinitely.

## Long-running command continuation

A yielded tool response does not end its process. Treat a command as running until a final exit code is reported. If the tool provides a background or resumable session ID, resume that same session with bounded waits and obtain its real exit code; never launch a duplicate of the same test, build, typecheck, or verification command while that session remains resumable. A quiet interval without stdout is expected state, not a failure.

Runtime STOP is valid only for explicit cancellation, an unrecoverable timeout without a resumable session, subprocess termination, tool/session loss, permission denial, or repository/machine unavailability. Agents must not invent `execution window ended` or an equivalent reason. Record the actual final exit code or the concrete runtime event before retrying, blocking, or reporting a failed command.

## State contract

State remains concise and must record: repository path; expected working branch; a Git-derived current reference; protected branches; run mode; maximum stages per run; stages completed in the current run; last checkpoint; stop reason; last completed product stage and commit; next approved stage; current-stage status; latest mandatory checks; latest migration static and runtime results; push and production status; known blockers; unresolved external-provider decisions; and last-run timestamp. Link to commits/tests/contracts rather than copying large reports.

## Completion and blocked-run contract

Complete a product stage only when its Roadmap scope is implemented, required files and targeted tests pass, security/privacy and compatibility review is complete, relevant migration static validation passes, runtime database validation is explicitly recorded where applicable, the diff is reviewed, one ordinary commit exists, and the worktree is clean. When runtime validation is unavailable, record `RUNTIME_VALIDATION = BLOCKED / NOT_AVAILABLE`; do not call it a pass.

If a stage is blocked, do not make a false-success commit or start a different stage. State must preserve the exact blocker, failing command/test, affected files, last known safe commit, and the next action: `RETRY`, `AUDIT`, `WAIT FOR HUMAN DECISION`, or `WAIT FOR ENVIRONMENT`.

## Controlled-run end report

Every interactive implementation run ends with: `STAGE RESULT: PASS / STOP`; completed stages and commits; starting/final HEAD; implemented scope; migration/runtime-validation result; tests; security review; State last-completed/next values; checkpoint result when due; commit/worktree/push status; production access/mutation status; blockers; and the next recommended action. Every continuous stage execution writes the same facts as valid JSON to `.autopilot-runtime/last-run.json`; the supervisor independently rejects unsupported PASS claims.

## Hard manual production gate

Autopilot may prepare candidates, migrations, test evidence, release notes, and checklists. It must never merge or push `main`, mutate `origin/main`, apply production migration, promote Vercel production, change production secrets, roll back/restores, or alter production data. Push to a non-main branch is permitted only when that exact branch, deployment consequences, and non-production target are verified and all checks pass; otherwise record `PUSH BLOCKED`.

## Ambiguity and providers

Stop for unresolved privacy, contact visibility, payment, verification/trust, VIN obligation, lifecycle deletion/retention, permission, production, legal-consent, or major scope decisions. Do not configure paid/external providers during bootstrap; their absence blocks only dependent work.
