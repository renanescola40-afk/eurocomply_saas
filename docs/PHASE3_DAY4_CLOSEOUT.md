# Phase 3 Day 4 Closeout

Day 4 of Phase 3 covers completion gates, evidence pack readiness, and owner acceptance.

## Command

Run from the repository root:

```bash
npm run phase3:day4
```

## Required checks

Day 4 validates:

- completion gates documentation
- automation gates
- strict runner gates
- generated report hygiene
- external gate checklist
- evidence pack readiness
- owner acceptance template
- two-command closeout path

## Required generated files

- `phase3-completion-gates-report.json`

## Required review artifacts

- `docs/PHASE3_EVIDENCE_PACK.md`
- `docs/PHASE3_OWNER_ACCEPTANCE_TEMPLATE.md`
- `docs/PHASE3_TWO_COMMAND_CLOSEOUT.md`

## Pass criteria

Day 4 is complete when:

- `check-phase3-completion-gates.mjs` exits with code 0.
- `check-phase3-evidence-pack.mjs` exits with code 0.
- `check-phase3-owner-acceptance-template.mjs` exits with code 0.
- `check-phase3-two-command-closeout.mjs` exits with code 0.
- `phase3-completion-gates-report.json` is generated from the checker.
- no owner acceptance blocker remains.
- no evidence pack blocker remains.
- no template paths are modified as part of Day 4 readiness work.

## Scope boundary

Do not mark Phase 3 repository-side complete until Day 1 through Day 4 checks pass and generated reports are reviewed.
