---
name: yolmod-release-production
description: "Prepare or execute a safe Yolmod production release, deployment, migration rollout, smoke test, or release-readiness assessment. Excludes routine local implementation and active incident response."
---
# Yolmod release and production
Follow repository `AGENTS.md`; production changes require explicit authorization. Never force-push, reset production data, or take destructive production actions.
## Activation and boundary
Use for release readiness, deployment, production migration rollout, and smoke testing. Exclude ordinary implementation and live incident triage.
## Workflow
1. Inspect Git status, included changes, migration state, environment assumptions, and rollback/mitigation path.
2. Follow as applicable: implementation, targeted verification, independent review for critical changes, migration readiness, authorized application, deploy, smoke test, Git verification, push/release confirmation.
3. Keep unrelated work out of the release and halt for missing production authority.
## Verification
Record readiness checks, deployment result, migration status, and smoke-test evidence.
## Completion report
Release scope; authorization-dependent actions taken; checks/results; rollback path; follow-up risks.
