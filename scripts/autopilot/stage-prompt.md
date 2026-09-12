# Yolmod supervised product-stage execution

Use `$yolmod-autopilot` and execute exactly one next approved product stage. This is one fresh non-interactive Codex execution managed by `scripts/autopilot/continuous.ps1`; do not begin a second product stage.

Before modifying files, read `AGENTS.md`, the autopilot skill, Product Spec, Roadmap, Rules, State, and the prior commit. Run `scripts/autopilot/preflight.ps1 -RequireClean` and `scripts/autopilot/safety-check.ps1`. Git and verified tests override State prose.

Implement only the next approved, dependency-valid stage. Complete its full lifecycle: inspect, implement, run targeted tests, diagnose safe failures, security/privacy/RLS/migration/compatibility review where relevant, rerun tests, update State, explicitly stage reviewed files, create exactly one ordinary commit, and verify a clean worktree. Do not push, access production, deploy, change secrets, reset, rebase, amend, squash, force-push, use destructive SQL, modify applied migrations, or touch `C:\Проекты\Otoyali-blueprint`.

If blocked, preserve all work and do not create a false-success commit. Do not start a following stage. For any migration, use the existing migration process, run `migration-check.ps1`, complete the required semantic review, and do not apply remotely.

Before exit, write valid JSON to `.autopilot-runtime/last-run.json` and return the identical JSON as the final response. It must satisfy `scripts/autopilot/stage-result.schema.json` and include the actual status, stage, starting/ending HEAD, commit, next stage, clean-worktree status, `tests_passed`, every executed package test script in `tests`, `push_performed: false`, `production_accessed: false`, and an exact `stop_reason` when not PASS. Update the State stage counter by one only after a PASS commit.
