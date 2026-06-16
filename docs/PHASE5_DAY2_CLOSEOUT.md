# Phase 5 Day 2 Closeout

Day 2 of Phase 5 covers the functional inventory and validation plan for organization-scoped compliance project workflows.

## Command

Run from the repository root:

```bash
npm run phase5:day2
```

## Required checks

Day 2 validates:

- functional inventory exists
- validation plan exists
- concrete files have been identified through direct file inspection
- routing files are named before functional changes
- organization dashboard query files are named before functional changes
- organization membership resolution is part of the validation plan
- dashboard data scoping is part of the validation plan
- onboarding and anonymous-user routing are part of the validation plan
- query fallbacks remain safe when optional schema objects are missing
- focused tests or checkers are named before implementation
- product, email, document, and UI template changes remain out of scope

## Pass criteria

Day 2 is complete when:

- `check-phase5-functional-inventory.mjs` exits with code 0
- `check-phase5-validation-plan.mjs` exits with code 0
- every identified functional file has a matching validation expectation
- dashboard organization scoping is explicitly covered
- route behavior for authenticated, anonymous, and no-organization users is explicitly covered
- no template path is modified for Day 2 work

## Scope boundary

Do not move to Phase 5 Day 3 until functional inventory and validation plan checks pass.
