---
name: yolmod-code-review
description: "Independently review a Yolmod diff, commit, completed change, or pre-merge candidate for correctness, security, data integrity, contracts, and missing tests. Excludes implementation unless requested after findings."
---
# Yolmod code review
Follow repository `AGENTS.md`. Default to read-only review; do not modify code initially.
## Activation and boundary
Use for reviews, audits of completed code, diff inspection, and pre-merge checks. Exclude implementation requests and active-defect diagnosis unless review is explicit.
## Workflow
1. Inspect only requested diff, commit, or change and understand intent.
2. Look for correctness, security, data-integrity, contract, regression, and missing-test issues.
3. Rank meaningful findings CRITICAL, HIGH, MEDIUM, or LOW with exact location and reasoning.
4. Clearly state when no meaningful finding exists; do not invent findings.
## Verification
Identify reviewed scope and checks/tests inspected or run.
## Completion report
Findings by severity; assumptions; scope reviewed; testing gaps.
