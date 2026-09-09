---
name: yolmod-api-contract
description: "Change or review Yolmod API routes, server actions, RPC calls, request/response contracts, validation boundaries, or data exposure. Excludes UI-only changes and schema-only migrations."
---
# Yolmod API contract
Follow repository `AGENTS.md`; current user instructions override this workflow except its safety requirements.
## Activation and boundary
Use for endpoints, server actions, RPC use, contracts, request validation, and public/private fields. Exclude UI-only edits and schema-only migration work. Pair with `yolmod-security-auth-rls` for authorization or sensitive-data changes.
## Workflow
1. Identify consumers and the current contract.
2. Preserve backward compatibility where practical; validate input explicitly and return precise errors.
3. Verify authentication/authorization; do not expose internal or private fields.
4. Update relevant types/tests and verify current consumers.
## Verification
Exercise valid and invalid requests and relevant authorization paths; run focused type and contract tests.
## Completion report
Contract change; compatibility impact; validation/auth checks; consumers/tests verified; remaining risk.
