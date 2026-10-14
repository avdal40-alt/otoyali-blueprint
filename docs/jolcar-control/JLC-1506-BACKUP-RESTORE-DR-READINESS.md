# JLC-1506 — local backup, restore, and disaster-recovery readiness

**Scope:** local non-production readiness only. This record does not authorize
production access, backup inspection, restore, migration, deployment, or
provider configuration.

## Safety boundary

- The existing `supabase_db_Otoyali-blueprint` application database is never
  backed up into, restored over, reset, dropped, truncated, or otherwise
  changed by this procedure.
- The exercise creates two GUID-suffixed databases whose names must match
  `jlc1506_(source|target)_[0-9a-f]{16}`. They contain only three synthetic
  probe rows and are deleted at the end of the test.
- The script accepts only the configured local Supabase database container and
  uses no project link, remote credentials, real user data, or provider call.
- A production restore remains an explicitly authorized, separately planned
  operation with verified target identity, approved backup retention and an
  incident/change record. It must not be improvised from this local exercise.

## Local exercise

After `scripts/jolcar/preflight.ps1` passes, run:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/jolcar/jlc-1506-backup-restore-exercise.ps1
```

The script performs this bounded sequence:

1. confirms the expected local Docker Postgres container is running;
2. creates isolated source and target exercise databases;
3. writes a synthetic table with three deterministic rows to the source;
4. creates a custom-format `pg_dump` archive in the local container;
5. restores that archive into the isolated target using `pg_restore`;
6. verifies row count, aggregate amount, and ordered labels (`3:87:alpha,beta,gamma`);
7. removes the archive and force-drops only the generated exercise databases.

Any failure is a failed readiness exercise: preserve its output, do not retry
against the existing application database, and investigate the local Docker or
Postgres tooling. Cleanup failure also fails the exercise because it violates
the zero-residual-state requirement.

## Incident recovery posture

1. Freeze the affected non-production environment and preserve logs, exact
   commit SHA, migration history, and a read-only evidence copy as appropriate.
2. Determine whether recovery is application-only, additive migration roll
   forward, or a separately approved restore. Do not use schema/data rollback
   to bypass forward-only migration discipline.
3. Rehearse restore into a newly provisioned, isolated non-production target;
   validate migration history, required schemas/extensions, row-level data
   invariants, and application smoke checks before any cutover decision.
4. For production, stop and obtain explicit authorization for the exact target
   and backup set. Production restores, retention policy, access controls, and
   final recovery time/objective commitments require their own operational
   approval and evidence.

This exercise proves that the local image can create and restore a bounded
Postgres custom archive with deterministic integrity checks. It does not claim
that a production backup exists or that production recovery has been tested.
