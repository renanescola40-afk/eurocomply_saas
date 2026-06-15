# Phase 1 Commit Guide

This guide explains what should be committed after running the local Phase 1 runner.

## Command

Run:

```bash
node scripts/dev/run-phase1.mjs
```

## Files expected to change

After a successful run, these files may be valid commit candidates:

- `package.json`
- `package-lock.json`

`package.json` may change because the dependency pin helper replaces known `latest` versions with explicit versions.

`package-lock.json` should be committed because it makes installs reproducible.

## Files that should not be committed

These local reports are intentionally ignored:

- `local-build-report.json`
- `local-quality-report.json`
- `phase1-status.json`
- `phase1-run-report.json`
- `dependency-pin-report.json`
- `dependency-pin-change-report.json`

## Recommended verification before commit

Run:

```bash
node scripts/dev/write-dependency-pin-report.mjs
node scripts/dev/check-local-foundation.mjs
npm run typecheck
npm run test
npm run build
```

## Commit rule

Commit only when:

- `package-lock.json` exists.
- no dependency uses `latest`.
- typecheck passes.
- tests pass.
- build passes.

## Suggested commit message

```text
Complete phase 1 local foundation
```
