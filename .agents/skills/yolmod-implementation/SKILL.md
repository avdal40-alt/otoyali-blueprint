---
name: yolmod-implementation
description: "Implement Yolmod features, ordinary application changes, business validation, or narrowly necessary refactors. Excludes pure debugging, migrations, security audits, architecture-only work, and production incidents."
---
# Yolmod implementation
Follow repository `AGENTS.md`; current user instructions override this workflow except its safety requirements.
## Activation and boundary
Use for feature delivery and ordinary changes. Exclude investigation-only work, migrations, security reviews, architecture decisions, and incidents.
## Workflow
1. Identify the outcome; inspect the smallest relevant path and existing pattern.
2. Define narrow scope; implement production-quality behavior without unrelated refactoring.
3. Add a complementary domain skill only for a real boundary crossing.
4. Run targeted verification and review the diff for scope and regressions.
## Verification
Run the smallest meaningful affected test, typecheck, lint, or build check; state checks not run.
## Completion report
Outcome; changed files; verification; remaining risks or unverified assumptions.
