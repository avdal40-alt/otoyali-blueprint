# Developer Workflow

## Rules

- One stage equals one focused commit.
- Do not mix unrelated changes.
- Do not use `git add .` from the repo root.
- Commit only relevant files.
- Always run lint/typecheck/build for web changes.
- If a Supabase migration exists, run `npx.cmd supabase db push` before push unless the active task explicitly says not to apply remote migrations.
- If GitHub/Vercel is broken or the GitHub account is flagged, do not push.
- Do not restore stashes unless explicitly planned and approved.
- For user-facing web copy/routes, check `docs/I18N.md` and update both Turkish and English dictionaries where safe.
- For marketplace categories, check `docs/VERTICAL_ARCHITECTURE.md` and update the central registry instead of scattering route checks.
- For service marketplace work, check `docs/SERVICE_MARKETPLACE_ARCHITECTURE.md`; do not add bookings, fake providers, ratings, CRM, work orders, or service history without a dedicated task.
- For booking foundation work, check `docs/BOOKING_ARCHITECTURE.md`; do not add booking UI, fake slots, notifications, payments, work orders, provider calendars, or Rif booking actions without a dedicated task.
- For assistant work, check `docs/AI_ARCHITECTURE.md`; do not add external AI providers, prompt persistence, secrets, or fake AI claims without a dedicated approved task.

AI-01 has no Supabase migration. If a future AI task needs persistence, stop and document the data model before creating tables.

SERVICE-01 has a Supabase migration. Do not apply it remotely unless the current task explicitly asks for `supabase db push`.

BOOKING-01A has a Supabase migration and a SQL verification script. The BOOKING-01A task explicitly forbids remote migration application and push; use local/static verification only unless a later task changes that instruction.

## Current Known Stashes

User-reported/current task context:

- Paused DOMAIN-01 - production domain URLs.
- WIP old Supabase local changes before next stage.
- WIP root docs cleanup before WEB-05.

Do not pop or apply these stashes without explicit approval.

## Recommended Task Report Format

```text
Commit:
Implemented:
Supabase migrations:
Dependencies:
Verification:
Working tree:
```

## Safe Commit Pattern

```powershell
git status -sb
git add -- path/to/file1 path/to/file2
git diff --cached --check
git commit -m "TASK - Message"
```

For this project, do not push while GitHub is flagged.
