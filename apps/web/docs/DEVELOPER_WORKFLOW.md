# Developer Workflow

## Rules

- One stage equals one focused commit.
- Do not mix unrelated changes.
- Do not use `git add .` from the repo root.
- Commit only relevant files.
- Always run lint/typecheck/build for web changes.
- If a Supabase migration exists, run `npx.cmd supabase db push` before push.
- If GitHub/Vercel is broken or the GitHub account is flagged, do not push.
- Do not restore stashes unless explicitly planned and approved.
- For user-facing web copy/routes, check `docs/I18N.md` and update both Turkish and English dictionaries where safe.
- For marketplace categories, check `docs/VERTICAL_ARCHITECTURE.md` and update the central registry instead of scattering route checks.

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
