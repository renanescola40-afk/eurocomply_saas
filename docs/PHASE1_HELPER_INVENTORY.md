# Phase 1 Helper Inventory

This inventory records the repository-side helpers for Phase 1 local technical validation.

## Package scripts

- `phase1:check` validates the Phase 1 gate and required generated lockfile.
- `phase1:capture` captures command evidence for install, typecheck, test, build, and lint.
- `phase1:smoke` captures local startup smoke evidence.
- `supply-chain:lockfile` generates `package-lock.json` through npm.

## Helper files

- `scripts/dev/run-phase1-checks.mjs`
- `scripts/dev/capture-phase1-evidence.mjs`
- `scripts/dev/capture-phase1-smoke.mjs`

## Test files

- `tests/phase1/local-base-validation.test.ts`

## Completion rule

Phase 1 is not complete until `package-lock.json` and all real command logs are generated from local execution or CI and committed.
