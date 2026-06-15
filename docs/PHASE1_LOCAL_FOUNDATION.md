# Phase 1 Local Foundation Checklist

This checklist is the first execution phase before production readiness work.

## Goal

Prove that the project can be installed, checked, tested, and built from a clean local environment.

## Recommended command

Run this command from the project root:

```bash
node scripts/dev/run-phase1-strict.mjs
```

After the package aliases are ensured, the equivalent npm command is:

```bash
npm run phase1:strict
```

The strict runner ensures Phase 1 aliases exist, validates them, runs the full local foundation flow, and prints `phase1-final-report.txt` at the end.

## What the flow validates

The phase is complete when:

- `package-lock.json` exists.
- `package-lock.json` is not ignored by Git.
- Required scripts exist in `package.json`.
- Phase 1 npm aliases exist and pass validation.
- No dependency uses `latest`.
- Node.js is compatible.
- The active npm major version matches `packageManager`.
- Typecheck passes.
- Unit tests pass.
- Build passes.
- The commit plan reports `readyToCommit: true`.

## Local diagnostic outputs

The runner writes local diagnostics that should not be committed:

- `phase1-run-report.json`
- `phase1-summary.json`
- `phase1-commit-plan.json`
- `phase1-final-report.txt`
- `phase1-status.json`
- `dependency-pin-report.json`
- `dependency-pin-change-report.json`
- `local-quality-report.json`
- `local-build-report.json`

## Expected gaps before local execution

Before the runner is executed locally or in Codespaces, the remaining expected gaps are:

- `package-lock.json` is missing until generated locally.
- `package.json` may still need Phase 1 aliases and dependency pins applied by the runner.
- Typecheck, tests, and build still need real local execution.

## Exit criteria

Phase 1 can be marked complete only after `phase1-final-report.txt` is reviewed and `package.json` plus `package-lock.json` are committed.
