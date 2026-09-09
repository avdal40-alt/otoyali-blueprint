---
name: yolmod-database-migration
description: "Design or implement safe Yolmod Supabase and PostgreSQL schema migrations, constraints, indexes, functions, triggers, or data migrations. Excludes application-only changes and production application without explicit authorization."
---
# Yolmod database migration
Follow repository `AGENTS.md`; its database safety rules are mandatory.
## Activation and boundary
Use for schema, PostgreSQL, Supabase migration, constraints, indexes, functions, triggers, and data migrations. Exclude application-only work. Pair with `yolmod-security-auth-rls` for policies, privileges, or sensitive data.
## Workflow
1. Inspect current schema, relevant migration history, and affected policies/functions.
2. Design the smallest additive, backward-compatible migration that preserves production data.
3. Consider locks, transaction duration, privilege/RLS impact, and rollback/mitigation when risk is meaningful.
4. Validate SQL and expected behavior. Do not apply production migration without explicit authorization.
Never reset the database or assume production data is recreatable.
## Verification
Validate SQL syntax, migration ordering, privileges/RLS impact, and targeted behavior in a safe local or approved environment.
## Completion report
Schema change; compatibility and lock/data considerations; validation; rollback/mitigation; whether anything was applied.
