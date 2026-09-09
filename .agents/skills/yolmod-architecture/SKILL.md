---
name: yolmod-architecture
description: "Plan Yolmod architecture for new domains, subsystems, cross-cutting changes, or consequential technical alternatives. Excludes small implementation details, bug fixes, and routine refactors."
---
# Yolmod architecture
Follow repository `AGENTS.md`. Plan before implementation; consult `SYSTEM_ARCHITECTURE` or related documentation only when relevant.
## Activation and boundary
Use for new domains/subsystems, major cross-cutting design, and decisions with material long-term impact. Exclude routine changes, bug fixes, and small refactors.
## Workflow
1. Define problem, constraints, and current relevant architecture.
2. Prefer existing patterns and evaluate minimal viable approach.
3. Assess security, data, operations, and migration impact.
4. Compare alternatives only where meaningful; recommend a design and safe migration path.
Avoid speculative abstraction. Do not implement until the design is sufficiently clear or requested.
## Verification
Validate the proposal against existing boundaries, dependencies, and operating assumptions.
## Completion report
Recommendation; rationale; alternatives/tradeoffs; rollout/migration; unresolved decisions.
