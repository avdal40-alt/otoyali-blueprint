# Wikidata Camry generations bootstrap quality report

- Snapshot: `wikidata-camry-generations-v1`, retrieved `2026-10-14T06:39:51Z`
- Source: Wikidata structured data, CC0-1.0; snapshot SHA-256 `5486a543ecb0e08ba9b47a434ed896f6588409d9b6636d34be5adb8e74c5c380`
- Source records considered: 10 generation candidates attached to Toyota Camry by Wikidata `P179`, with direct `P31=Q3231690` selection for approved candidates.
- Approved source anchors: 1 make (Toyota) and 1 model (Camry); both map to existing local canonical rows and were not overwritten.
- Imported rows: 0 makes, 0 models, 7 generations.
- Rejected/ambiguous candidates: 3, all `unsupported_or_ambiguous_relationship` (Aurion, Camry Solara, Camry TS-01). Details are in `wikidata-camry-generations-2026-10-14.rejections.json`.
- Coverage: Toyota → Camry has 7 accepted generations (XV10, XV20, XV30, XV40, XV50, XV70, XV80).
- Production years: none imported. The selected source records did not provide verified production-year claims, so the bootstrap intentionally leaves both year columns null.
- Models with zero accepted generations: none within this approved snapshot scope. The other 760 pre-existing local models remain outside this deliberately narrow bootstrap scope and still have zero imported generations; this is a known coverage gap, not hidden coverage.

| Canonical table | Before | After first import | After identical second import |
| --- | ---: | ---: | ---: |
| `vehicle.makes` | 118 | 118 | 118 |
| `vehicle.models` | 761 | 761 | 761 |
| `vehicle.generations` | 0 | 7 | 7 |
| `vehicle.variants` | 43 | 43 | 43 |
| `vehicle.modifications` | 0 | 0 | 0 |

The local dataset registry contains one `wikidata@wikidata-camry-generations-v1` row with the snapshot hash, retrieval metadata, entity identifiers, and exact GET request definitions. The repeated local import created no duplicate dataset or generation provenance rows.
