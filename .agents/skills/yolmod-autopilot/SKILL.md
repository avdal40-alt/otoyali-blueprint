---
name: yolmod-autopilot
description: "Execute approved autonomous Yolmod V1 roadmap stages with local safety gates. Use for V1 continuation and stage execution; excludes releases, main-branch changes, and unattended recovery."
---
# Yolmod autopilot

Use this skill only for the local Yolmod V1 development loop. Interactive manual mode may execute up to three approved, sequential implementation stages in one run, with exactly one ordinary commit per stage. Continuous supervised mode uses `scripts/autopilot/continuous.ps1`: each fresh Codex execution performs exactly one stage, while the supervisor may start subsequent executions after independent gates pass. Neither mode bypasses account or Codex usage limits.

Never rely on prior chat context, remembered command output, prior Codex conclusions, or invisible state from another thread. Git and verified test results override markdown state if they conflict. If an important decision exists only in chat and is not represented in repository documentation, stop rather than guess.

## Controlled-run start protocol

Before modifying files, in this order:

1. Locate the repository root and read `AGENTS.md`.
2. Read this skill, `docs/autopilot/YOLMOD_V1_PRODUCT_SPEC.md`, `docs/autopilot/IMPLEMENTATION_ROADMAP_V1.md`, `docs/autopilot/AUTOPILOT_RULES.md`, and `docs/autopilot/AUTOPILOT_STATE.md`.
3. Run `scripts/autopilot/preflight.ps1 -RequireClean` and `scripts/autopilot/safety-check.ps1`; compare their results with State and stop if the tree is not clean, the baseline cannot be reconciled, or a required local tool is unavailable.
4. Inspect the previous stage commit and confirm the next approved stage from State and Roadmap. Load the specialised Yolmod skill relevant to that stage.
5. If a detailed engineering contract is needed, derive it from the Spec, Roadmap, actual code, tests, migrations, and durable contracts. Record any material decision needed by a future thread in repository documentation.

Set the controlled-run counter to zero at the start in interactive manual mode. In continuous supervised mode, perform exactly one stage, increment the State counter only after its PASS commit, write the required machine-readable result, and exit.

## Controlled multi-stage continuation

After a successful stage commit, continue only when all of the following are true: the commit succeeded; the worktree is clean; State reconciles with Git; Roadmap explicitly identifies a dependency-valid next stage; required tests passed; no production action, unresolved provider decision, business/product ambiguity, or security/privacy issue blocks it; and the next stage does not require a destructive migration.

Before selecting the next stage, rerun `preflight.ps1 -RequireClean` and `safety-check.ps1`, inspect the just-created commit, and reconstruct the next-stage context from repository sources. Do not use remembered chat conclusions as a substitute for durable contracts.

If any continuation condition fails, stop and record the exact reason. A fresh thread is not required merely because one stage completed.

In interactive manual mode, after the third successful product-stage commit, run `scripts/autopilot/checkpoint.ps1`, record its actual result, and stop. In continuous supervised mode, three successful stages are a checkpoint cadence, not a stop condition: the supervisor runs the checkpoint and starts a fresh execution only when it passes. An early stop is allowed only for a concrete risk, dependency, environment, or context reason and must be reported accurately.

## Long-running command continuation

Treat a terminal command as active until its actual process exit code is obtained. A tool yield, execution-window boundary, delayed response, or temporary lack of stdout is not command completion or failure.

When a tool returns a background or resumable session ID, continue that exact session until it reports a final exit code. Do not start a duplicate invocation of the same test, build, typecheck, migration check, or other command while its original session remains resumable. Poll or resume it with bounded waits; silence alone is not a failure.

Runtime STOP is permitted only after an explicit cancellation, an unrecoverable timeout with no resumable session, subprocess termination, tool/session loss, permission denial, or repository/machine unavailability. Never invent an `execution window ended` reason. Record the actual terminal outcome or the concrete runtime event before retrying, blocking, or reporting a command failure.

## Stage execution and completion

Make the minimal change. For database, auth, access-control, or release work load the relevant Yolmod skill and satisfy its additional gates. Run the relevant checks. For any migration, run `migration-check.ps1` and perform a human SQL/RLS/privilege review; its structural scan is a guardrail, not proof of migration safety.

Mark a product stage complete only when its Roadmap scope and required files are implemented; targeted tests pass; relevant security/privacy and backward-compatibility review is complete; migration static validation passes when a migration exists; runtime validation is explicitly recorded when applicable; the diff is reviewed; one ordinary commit exists; and the worktree is clean. If runtime validation is unavailable, record `RUNTIME_VALIDATION = BLOCKED / NOT_AVAILABLE`; never represent it as a pass.

Update `docs/autopilot/AUTOPILOT_STATE.md` in the stage commit with factual status, checks, the last safe commit, and exactly one next unblocked small task. Stage only explicitly reviewed files.

## Controlled-run end protocol

After each stage commit, update the controlled-run counter and identify the next stage. At the run end, report: `STAGE RESULT: PASS / STOP`; every completed stage and commit; starting and final HEAD; implemented scope; migration and runtime-validation results; tests; security review; State last-completed/next values; checkpoint result when due; commit/worktree/push status; production access/mutation status; blockers; and `NEXT RECOMMENDED ACTION`. Recommended titles such as `YOLMOD — <STAGE-ID>` are convenience only and never state.

On a blocked or failing run, do not create a false-success commit or begin an unrelated stage. Record the exact blocker, failing command/test, affected files, last known safe commit, and whether the next action must `RETRY`, `AUDIT`, `WAIT FOR HUMAN DECISION`, or `WAIT FOR ENVIRONMENT`.

Never reset history, amend/squash, force-push, rewrite an applied migration, reset/truncate/delete database data, expose secrets, or perform an unconfirmed remote action. Do not push, deploy, apply a migration, or use staging/production until its target identity, release path, and authority are explicitly confirmed. Stop and report a concrete blocker for unclear business logic, missing access, or a recurring failure.
