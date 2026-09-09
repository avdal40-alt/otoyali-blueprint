---
name: yolmod-production-incident
description: "Respond to a Yolmod production outage, severe regression, failed deployment, critical user-flow failure, or major production error. Excludes normal debugging and planned release work."
---
# Yolmod production incident
Follow repository `AGENTS.md`; prioritize production safety. Do not take destructive emergency actions or broad-refactor during response.
## Activation and boundary
Use for outages, severe regressions, broken deployments, critical-flow failures, and major production errors. Exclude ordinary local debugging and planned release work.
## Workflow
1. Contain safely while preserving evidence; determine blast radius.
2. Identify likely recent changes and prefer reversible mitigation.
3. Establish root cause before a durable fix when safely possible.
4. Run focused verification and appropriate production smoke test.
5. Record root cause and prevention action.
## Verification
Capture containment result, affected population, evidence consulted, mitigation/fix validation, and smoke-test outcome.
## Completion report
Impact/timeline; containment; root cause or hypothesis; mitigation/fix; verification; prevention/follow-up.
