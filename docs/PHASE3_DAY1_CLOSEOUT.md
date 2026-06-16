# Phase 3 Day 1 Closeout

Day 1 of Phase 3 covers production readiness inventory and repository gates.

## Command

Run from the repository root:

```bash
npm run phase3:files
npm run phase3:check
```

## Required checks

Day 1 validates that the repository contains:

- production readiness scope
- deployment runbook
- database migration safety guide
- runtime security and observability guide
- auth and session readiness guide
- completion gates
- Phase 3 checker scripts

## Required generated files

- `phase3-production-readiness-report.json`

## Pass criteria

Day 1 is complete when:

- `npm run phase3:files` exits with code 0.
- `npm run phase3:check` exits with code 0.
- `phase3-production-readiness-report.json` is generated from the checker.
- No template paths are modified as part of Phase 3 readiness work.

## Scope boundary

Do not move to Phase 3 Day 2 until Day 1 checks pass and the generated report is reviewed.
