# Phase 1 Helper Inventory

This inventory records the repository-side helpers for Phase 1 local technical validation.

## Package scripts

- `phase1:check` validates the Phase 1 gate and required generated lockfile.
- `phase1:capture` captures command evidence for dependency triage, install, typecheck, test, build, and lint.
- `phase1:smoke` captures local startup smoke evidence.
- `supply-chain:lockfile` generates `package-lock.json` through npm.
- `supply-chain:floating-deps` lists floating dependency specs that must be resolved through the generated lockfile before Phase 1 is complete.

## Helper files

- `scripts/dev/run-phase1-checks.mjs`
- `scripts/dev/capture-phase1-evidence.mjs`
- `scripts/dev/capture-phase1-smoke.mjs`

## Documentation files

- `docs/PHASE1_EXECUTION_GATE.md`
- `docs/PHASE1_LOCAL_VALIDATION_RUNBOOK.md`
- `docs/evidence/phase1/README.md`

## Test files

- `tests/phase1/local-base-validation.test.ts`

## Evidence files

- `docs/evidence/phase1/floating-deps.log`

## Completion rule

Phase 1 is not complete until `package-lock.json` and all real command logs are generated from local execution or CI and committed.
