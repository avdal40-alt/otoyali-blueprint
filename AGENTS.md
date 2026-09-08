# YOLMOD — Codex Project Instructions

## Core priorities

All work in this repository must follow these priorities, in this order:

1. Security First
2. Production First
3. Architecture First
4. Correctness
5. Maintainability
6. Efficiency

Token/context efficiency must never override security, correctness, production safety, or data integrity.


## Project context

Yolmod is a production-oriented automotive marketplace built with:

- Next.js
- TypeScript
- Supabase
- PostgreSQL
- Row Level Security (RLS)
- Supabase Storage
- PostGIS
- Vercel

Treat the repository as a real production application, not a prototype.

Before introducing a new pattern, prefer existing project architecture and conventions.


## Context efficiency

Work efficiently without sacrificing correctness.

For every task:

- Start with the smallest relevant scope.
- Inspect files directly related to the requested task first.
- Prefer targeted code search over broad repository exploration.
- Do not scan the entire repository unless genuinely required.
- Do not repeatedly re-read files already inspected in the current task unless new evidence requires it.
- Do not read large documentation files unless they are relevant to the task.
- Reuse established architecture instead of rediscovering it.
- Keep investigation proportional to the risk of the change.

For routine changes, avoid exhaustive architectural investigation.

For security-critical or production-critical changes, deeper investigation is allowed and expected.


## Task boundaries

Stay within the requested scope.

- Do not perform unrelated refactoring.
- Do not rename unrelated files or symbols.
- Do not reformat unrelated code.
- Do not modify unrelated dependencies.
- Do not change architecture unless required by the task.
- If an unrelated problem is discovered, report it separately instead of automatically fixing it.
- Modify the minimum set of files necessary for a correct production-quality implementation.

Before expanding scope substantially, explain why expansion is necessary.


## Reasoning policy

Use the minimum reasoning depth necessary while preserving correctness.

Routine work includes:

- UI changes
- ordinary bug fixes
- TypeScript fixes
- validation changes
- straightforward API work
- targeted tests
- small refactors
- text/content changes

These tasks should normally be handled without exploring unrelated parts of the system.

Use deeper reasoning for:

- authentication
- authorization
- RLS
- privilege boundaries
- database migrations
- schema changes
- storage security
- listing lifecycle permissions
- production incidents
- architecture changes
- data migrations
- destructive or irreversible operations


## Security

Security-sensitive changes require explicit verification.

Always treat these areas as high risk:

- authentication
- authorization
- RLS policies
- RPC permissions
- service-role usage
- storage access
- profile ownership
- listing ownership
- moderation transitions
- admin privileges
- seller contact visibility
- private media
- user-generated data

Never rely only on UI restrictions for authorization.

Authorization must be enforced server-side and/or at the database level where appropriate.

Do not weaken existing security controls to make a feature easier to implement.

When changing RLS or privileges:

- verify anonymous access
- verify authenticated access
- verify owner access
- verify non-owner access
- verify admin/service behavior where relevant
- check for privilege escalation paths


## Database and migrations

Production database safety is mandatory.

Rules:

- Migrations must be additive whenever possible.
- Do not reset the database.
- Do not drop production data.
- Do not truncate production tables.
- Do not use destructive migrations unless explicitly approved.
- Never assume production data can be recreated.
- Preserve backward compatibility where practical.
- Prefer safe staged migrations for risky schema changes.

Before creating a migration:

1. inspect the relevant current schema
2. inspect related existing migrations
3. understand current RLS and constraints
4. create the smallest safe change

After creating a migration:

- validate SQL syntax
- review privileges
- review RLS impact
- review backward compatibility
- verify expected behavior


## Git safety

Preserve repository history.

Rules:

- One logical stage should produce one logical commit.
- Do not amend existing commits unless explicitly instructed.
- Do not squash history unless explicitly instructed.
- Do not force-push.
- Do not rewrite Git history.
- Do not delete existing branches without explicit instruction.
- Do not modify or drop existing stashes.
- Do not perform destructive Git operations.

Before significant changes, check repository status.

Do not include unrelated files in commits.


## Testing strategy

Use targeted verification first.

Preferred order:

1. targeted test for affected behavior
2. targeted typecheck
3. targeted lint
4. relevant integration test
5. broader test suite only when justified

Do not repeatedly run unchanged expensive test suites.

Run broader verification when:

- security boundaries changed
- database behavior changed
- shared infrastructure changed
- core authentication changed
- production-critical code changed
- targeted tests indicate broader regression risk

Do not claim success if relevant verification was not run.

Clearly state what was tested and what was not.


## Agent and tool efficiency

Avoid unnecessary parallelism.

- Do not spawn subagents for simple sequential tasks.
- Do not ask multiple agents to inspect the same code independently unless performing a deliberate audit.
- Do not duplicate repository exploration.
- Use targeted tools and searches.
- Prefer direct inspection of likely files before broad scans.

Use independent review only when it materially improves confidence, especially for security and production-critical work.


## Documentation

Consult project documentation only when relevant.

Likely relevant documents may include:

- PRODUCT_VISION
- SYSTEM_ARCHITECTURE
- DATABASE_SCHEMA
- AI_ARCHITECTURE
- ROADMAP
- API_DESIGN
- SUPABASE_SETUP
- SECURITY
- DEVELOPMENT_RULES
- ENGINEERING_PRINCIPLES

Do not read all project documents automatically for every task.

Use the smallest relevant subset.


## Implementation quality

Prefer:

- existing abstractions
- existing project conventions
- typed interfaces
- explicit error handling
- precise validation
- minimal surface-area changes
- production-safe defaults

Avoid:

- speculative abstractions
- unnecessary rewrites
- broad refactors
- duplicated business logic
- placeholder security
- silent failures
- generic errors when precise errors are available


## Final verification

Before declaring a task complete:

- review the diff
- ensure no unrelated files changed
- confirm requested behavior is implemented
- confirm relevant tests/checks passed
- check for security regressions
- check for database/migration risk if applicable
- check Git status

If something could not be verified, say so explicitly.


## Safety override

Efficiency rules are secondary to:

- security
- correctness
- production stability
- database integrity
- authentication correctness
- authorization correctness
- RLS correctness
- migration safety
- Git safety

When efficiency conflicts with safety, safety always wins.