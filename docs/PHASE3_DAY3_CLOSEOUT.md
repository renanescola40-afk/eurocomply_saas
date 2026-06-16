# Phase 3 Day 3 Closeout

Day 3 of Phase 3 covers deployment runbook readiness and database migration safety.

## Command

Run from the repository root:

```bash
npm run phase3:day3
```

## Required checks

Day 3 validates:

- required production secrets are documented without real values
- pre-deployment checks exist
- deployment method exists
- post-deployment smoke checks exist
- rollback triggers exist
- rollback method exists
- incident handoff notes exist
- migration source of truth exists
- pre-migration checklist exists
- prohibited migration patterns are documented
- post-migration verification exists
- database rollback caution exists

## Required generated files

- `phase3-production-readiness-report.json`

## Pass criteria

Day 3 is complete when:

- deployment runbook checks pass through `npm run phase3:check`.
- database migration safety checks pass through `npm run phase3:check`.
- `phase3-production-readiness-report.json` is generated from the checker.
- no deployment or migration blocker remains.
- no template paths are modified as part of Day 3 readiness work.

## Scope boundary

Do not move to Phase 3 Day 4 until Day 3 checks pass and the generated report is reviewed.
