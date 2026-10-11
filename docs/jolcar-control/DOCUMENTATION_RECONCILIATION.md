# Jolcar documentation reconciliation

**Status:** active governance record
**Reviewed:** 2026-10-11
**Scope:** repository documentation and JLC-0001 baseline evidence, including
the subsequent local search, raise-to-top, and seller-analytics commits

## Controlling documents

For Jolcar planning and autonomous local work, the controlling documents are, in
order:

1. [MASTER_PLAN.md](./MASTER_PLAN.md)
2. [TASK_QUEUE.json](./TASK_QUEUE.json)
3. [DECISIONS.md](./DECISIONS.md)

The master plan defines required scope and release gates, the queue defines
dependency-ordered work, and the decisions log records confirmed, revoked,
proposal, and open decisions. Current Git and verified tests determine actual
implementation state. No older repository prose can approve work, override a
confirmed decision, or close an open decision.

## Documentation inventory and disposition

| Location | Role | Jolcar disposition |
| --- | --- | --- |
| `docs/jolcar-control/MASTER_PLAN.md` | Jolcar scope and release gates | Controlling |
| `docs/jolcar-control/TASK_QUEUE.json` | Runnable task order and gates | Controlling |
| `docs/jolcar-control/DECISIONS.md` | Approved, revoked, proposal, and open decisions | Controlling |
| `AGENTS.md` and `docs/jolcar-control/AGENTS.md` | Engineering and autonomous-work safety rules | Controlling operational policy; the Jolcar control documents prevail for Jolcar product direction. |
| Root `README.md`, `PRODUCT_VISION.md`, `ROADMAP.md`, and root technical blueprints | OTOYALI/Turkey strategic and technical history | Legacy reference only; not Jolcar product authority. The root technical blueprints carry a governance notice. |
| `docs/autopilot/` | Historical YOLMOD execution records, V1 scope, and automation rules | Legacy reference only for reusable implementation evidence; its stage state and Turkey plan do not select Jolcar work. |
| `apps/web/docs/` | Current web implementation, contracts, operations, and handoff notes | Implementation reference; validate statements against code/tests and the control documents before relying on them for Jolcar scope. Auth, i18n, Supabase, deployment, and roadmap records identify inherited state and link to the controls. |
| `apps/flutterflow/` and `FLUTTERFLOW_STRUCTURE.md` | Historical FlutterFlow implementation/design handoff | Legacy reference only; it does not change the confirmed Next.js Jolcar baseline. |

## Identified conflicts and stale decisions

The entries below are recorded, not silently rewritten. The control documents
are authoritative for each conflict.

| Legacy prose | Conflict | Controlling record |
| --- | --- | --- |
| Root `README.md`, `PRODUCT_VISION.md`, `ROADMAP.md`, and related blueprints describe OTOYALI as Turkey-first and name Turkey-specific domain, language, provider, and regulatory assumptions. | Jolcar is Kazakhstan-first; shared technology must not hard-code either country into reusable core. | `DECISIONS.md` D-001–D-004; `MASTER_PLAN.md` multi-country foundation. |
| Root vision, roadmap, schema, and AI documentation propose payments, escrow, transaction settlement, paid transaction flows, and related providers. | Buyer-seller payments, escrow, and in-platform vehicle reservation transactions are revoked/excluded. | `DECISIONS.md` D-021 and R-001; `MASTER_PLAN.md` explicit exclusions. |
| Root product documentation describes seller/dealer review and rating systems. | Seller/dealer ratings and reviews are prohibited; vehicle owner reviews are the approved review domain. | `DECISIONS.md` D-019, D-020, and R-002. |
| Root documentation and the inherited `apps/web/docs/AUTH_AND_ACCESS.md` describe OTP-primary login and Turkey-default phone behavior. | The current web implementation is Turkey-oriented, but Jolcar’s approved target is `+7`, one registration OTP followed by password enrollment, and routine phone-plus-password login with no routine OTP. Production SMS activation remains separately guarded. | `DECISIONS.md` D-006–D-010 and O-005; JLC-0001 baseline audit. |
| Root and FlutterFlow material name Flutter/FlutterFlow as the product frontend, while app-web records OTOYALI/Turkey deployment assumptions. | The confirmed baseline is the existing Next.js, TypeScript, Supabase/Postgres/RLS/Storage, PostGIS, and Vercel direction. FlutterFlow material is historical reference only. | `DECISIONS.md` D-004; `MASTER_PLAN.md` technical baseline. |
| `docs/autopilot/YOLMOD_V1_PRODUCT_SPEC.md` and `AUTOPILOT_STATE.md` select Turkey/YOLMOD stages and report their completion. | They cannot claim Jolcar completion, select Jolcar tasks, or waive Jolcar release gates. | `DECISIONS.md` D-045; `TASK_QUEUE.json`. |
| Legacy documents propose or assume specific AI, SMS, live, VIN, analytics, domain, card-ratio, and localization choices. | The confirmed choices are Jolcar / Жолкар, `kk-KZ`/`ru-KZ`/`en`, 4:3 cards, `+7` auth policy, repository-versioned Kazakhstan geo data, Kazakhstan dealer verification, XLSX/CSV/HTTPS JSON dealer ingestion, the seven-day free raise rule, Amazon IVS behind an adapter, optional VIN without external provider, and licensed/original news only. AI, voice, analytics, legal/support content, and native-app timing remain open. | `DECISIONS.md` O-001–O-017; `MASTER_PLAN.md`. |
| `apps/web/docs/SUPABASE.md` and `DEPLOYMENT.md` contained normal-flow remote push, migration, and deployment instructions. | Those operations are not authorized for Jolcar autonomous work. The documents now mark the records as historical and local-only work as the operative boundary. | `MASTER_PLAN.md` §§3, 17–18; `DECISIONS.md` D-044. |
| `apps/web/docs/PRODUCT_ROADMAP.md` lists completed and suggested OTOYALI stages, including payment work. | Historical stage status cannot close, order, or add Jolcar tasks; buyer-seller payments and escrow remain excluded. | `TASK_QUEUE.json`; `DECISIONS.md` R-001; `MASTER_PLAN.md` §§18–20. |

Some legacy documents discuss service appointment reservations. That is distinct
from the revoked buyer-seller vehicle reservation transaction. It remains
implementation reference only and needs a dedicated Jolcar task before being
treated as product scope.

## Missing or incomplete Jolcar documentation

These are gaps to be resolved by their dependency-appropriate tasks or user
decisions. This record does not manufacture their content.

| Missing/incomplete documentation | Gate or decision |
| --- | --- |
| Kazakhstan translated product, system, notification, and SEO copy | Launch locales are decided in O-001; copy implementation remains task-owned. |
| Final production domain/host and final accent value | O-002 and O-003 defer these to release/design work. The brand and 4:3 ratio are decided. |
| Production SMS vendor activation | O-005 decides policy but defers provider activation; JLC-0308 is manual authorization. |
| AI provider/model/cost limits, voice approach, production analytics vendor, legal/support content owner, and native-app timing | O-011, O-012, O-014–O-016 remain open. |
| Jolcar-specific engineering principles, vehicle-domain documentation, and implementation plan | These named project documents are absent from the repository inventory; future task-owned work must not infer them from legacy OTOYALI blueprints. |
| Kazakhstan legal, privacy, terms, support, and content-owner material | O-015; later legal/support readiness task |
| Jolcar-specific operational runbooks and release evidence | Future task-owned documentation; no legacy deployment document is authority for a Jolcar release. |

## Use rules

- Keep historical documents intact unless a future task explicitly migrates or
  retires them; do not reinterpret their proposals as approved Jolcar work.
- Update this reconciliation record when a task finds a material documentation
  contradiction or when an approved decision changes.
- Link new repository-local planning docs to the three controlling documents
  above rather than creating another source of truth.
- Do not use this record to mark Jolcar implementation complete: only the
  task queue plus task-specific Git/test evidence can do that.
