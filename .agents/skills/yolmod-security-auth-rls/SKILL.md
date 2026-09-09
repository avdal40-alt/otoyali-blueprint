---
name: yolmod-security-auth-rls
description: "Secure or audit Yolmod authentication, authorization, RLS, RPC privileges, Storage, ownership, moderation, admin, service-role, or private-data boundaries. Excludes ordinary non-sensitive implementation."
---
# Yolmod security, auth, and RLS
Follow repository `AGENTS.md`; this is high-risk. For pure review, report findings before changes unless remediation is explicitly requested.
## Activation and boundary
Use for authentication, authorization, RLS, RPC privileges, Storage access, ownership, admin/service role, moderation transitions, and private contact/user data. Exclude non-sensitive feature work.
## Workflow
1. Define trust boundary, protected resource, and attacker paths.
2. Inspect server/database enforcement; UI restrictions never suffice.
3. Test anonymous, authenticated, owner, and non-owner behavior; include admin/service behavior when relevant.
4. Check direct RPC/API bypasses and privilege escalation.
5. Run targeted security tests and rank findings by severity.
## Verification
Record exercised role matrix and enforcement layer(s).
## Completion report
Boundary; roles verified; findings/fix by severity; tests; residual risk.
