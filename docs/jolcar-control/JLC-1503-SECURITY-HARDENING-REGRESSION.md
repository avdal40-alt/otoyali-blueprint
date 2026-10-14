# JLC-1503 — Security hardening regression

**Date:** 2026-10-15
**Scope:** local repository and local Supabase only.

## Enforced local gate

`npm run test:jlc-1503` composes the completed JLC-1301 security/privacy/RLS
regression with the upload ownership/sanitization and anti-fraud moderation
regressions. A failure of any delegated gate fails this release gate.

| Risk boundary | Enforced by |
| --- | --- |
| Authorization, RLS, public privacy, abuse controls, and service-role boundaries | `test:jlc-1301` |
| Upload validation, owner-scoped media finalization, and safe derivatives | `test:jlc-0507` |
| Duplicate/bulk abuse signals and private moderation data | `test:jlc-0703` |
| Browser client service-credential references | `test:jlc-1503` static guard |
| Production dependency advisories | patched `next` 15.5.28, `sharp` 0.35.5, and `source-map-js` 1.2.2; verified with `npm audit --omit=dev --audit-level=high` |

The dependency pins respond to the local audit findings for Next.js cache
poisoning, Sharp/librsvg, and source-map-js. The gate must not be passed when
the production audit reports high or critical vulnerabilities.

`npm audit --audit-level=high` also reports ten high-severity findings in the
development-only ESLint/Tailwind build toolchain. They do not enter the
production dependency tree (`npm audit --omit=dev --audit-level=high` reports
zero vulnerabilities), but they remain an explicit release-readiness blocker
for a separately reviewed toolchain upgrade: the available Tailwind remediation
is a breaking major version. They are not waived or represented as fixed by
this task.

## Boundaries retained

No authorization control, RLS policy, security-invoker function, or media
privacy boundary was weakened. The combined tests retain seller-contact,
listing lifecycle, public projection, and country-profile protections. No
provider, production credential, remote migration, deployment, or push was
used.
