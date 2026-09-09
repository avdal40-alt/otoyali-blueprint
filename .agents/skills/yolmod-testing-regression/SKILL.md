---
name: yolmod-testing-regression
description: "Test, QA, reproduce, validate, or add regression coverage for a Yolmod change or bug. Excludes implementing a feature when testing is not the requested focus."
---
# Yolmod testing and regression
Follow repository `AGENTS.md`; never claim an unexecuted check passed.
## Activation and boundary
Use when asked to test, verify, QA, reproduce, validate, or add regression coverage. Exclude primary implementation work when testing is incidental.
## Workflow
1. Determine changed behavior and smallest meaningful test surface.
2. Run focused tests first; add regression coverage when justified.
3. Exercise happy and meaningful failure paths, including applicable permission roles.
4. Expand only when the change or focused evidence justifies it.
## Verification
Report every command or reproduction executed and result; identify important coverage not run.
## Completion report
Behavior tested; coverage added/updated; commands/results; untested paths; confidence/risk.
