# Phase 2 Day 2 Closeout

Day 2 covers CI validation: clean install, lint, typecheck, tests, build, and security CI.

## Command

Run from the repository root or CI runner:

```bash
npm run phase2:day2:closeout
```

This runs the Day 2 capture helper and then validates the generated Day 2 evidence.

## Required generated files

- `docs/evidence/phase2/day2-npm-ci.log`
- `docs/evidence/phase2/day2-lint.log`
- `docs/evidence/phase2/day2-typecheck.log`
- `docs/evidence/phase2/day2-test.log`
- `docs/evidence/phase2/day2-build.log`
- `docs/evidence/phase2/day2-security-ci.log`
- `docs/evidence/phase2/day2-artifacts-summary.md`

## Pass criteria

Day 2 is complete when:

- Every Day 2 log exists.
- Every Day 2 log has `## exitCode: 0`.
- `day2-artifacts-summary.md` exists.
- `npm run phase2:day2:evidence` exits with code 0.

## Scope boundary

Do not start Day 3 until Day 2 evidence is committed and reviewed.
