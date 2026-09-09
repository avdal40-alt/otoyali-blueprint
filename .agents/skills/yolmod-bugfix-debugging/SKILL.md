---
name: yolmod-bugfix-debugging
description: "Diagnose and fix Yolmod runtime errors, failed tests, regressions, incorrect persisted data, or unexpected UI and API behavior. Excludes feature work without evidence of failure."
---
# Yolmod bugfix debugging
Follow repository `AGENTS.md`; current user instructions override this workflow except its safety requirements.
## Activation and boundary
Use for broken behavior, errors, regressions, failed tests, incorrect saved data, and unexpected UI/API results. Exclude requested new capability with no failure to diagnose.
## Workflow
1. Reproduce the failure or establish concrete evidence.
2. Trace the narrow failing path; identify a plausible root cause before editing and distinguish symptom from cause.
3. Implement the smallest correct fix; add or update regression coverage where practical.
4. Verify the failure is resolved and assess adjacent regression risk.
Never make speculative fixes without a plausible root cause.
## Verification
Run the focused reproduction or regression test and the smallest relevant static check.
## Completion report
Evidence and root cause; fix; regression coverage; verification; remaining risk.
