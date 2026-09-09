---
name: yolmod-performance
description: "Investigate and improve Yolmod slow pages, APIs, PostgreSQL queries, indexes, bundle size, rendering, or unnecessary network work. Excludes optimization without evidence and broad rewrites."
---
# Yolmod performance
Follow repository `AGENTS.md`; preserve correctness and production safety.
## Activation and boundary
Use for measured/evidenced page, API, query, index, rendering, bundle, or network problems. Exclude speculative optimization and unrelated broad rewrites.
## Workflow
1. Measure or establish evidence and identify dominant cost.
2. Apply the narrowest optimization that preserves behavior.
3. For database work, account for index write/storage cost and migration safety.
4. Compare before/after when possible and inspect regression risk.
## Verification
Record workload, metric, baseline, result, and limitations; run focused correctness checks.
## Completion report
Bottleneck evidence; change; before/after; correctness verification; tradeoffs and residual risk.
