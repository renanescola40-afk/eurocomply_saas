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

## Evidence files

- `docs/PHASE1_EXECUTION_GATE.md`
- `docs/evidence/phase1/README.md`
- `docs/evidence/phase1/npm-ci.log`
- `docs/evidence/phase1/typecheck.log`
- `docs/evidence/phase1/test.log`
- `docs/evidence/phase1/build.log`
- `docs/evidence/phase1/lint.log`
- `docs/evidence/phase1/dev-smoke.log`

## Completion rule

Phase 1 is not complete until `package-lock.json` and all real command logs are generated from local execution or CI and committed.
