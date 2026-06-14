# Phase 1 Local Foundation Checklist

This checklist is the first execution phase before production readiness work.

## Goal

Prove that the project can be installed, checked, tested, and built from a clean local environment.

## Commands

Run these commands from the project root:

```bash
npm install --package-lock-only --ignore-scripts
node scripts/dev/check-local-foundation.mjs
npm run typecheck
npm run test
npm run build
```

## Required result

The phase is complete when:

- `package-lock.json` exists.
- Required scripts exist in `package.json`.
- No dependency uses `latest`.
- Typecheck passes.
- Unit tests pass.
- Build passes.
- The app starts locally.

## Current expected gaps

At the time this checklist was added, the checker is expected to flag:

- Missing `package-lock.json` until generated locally.
- Dependencies still using `latest` until pinned.

## Exit criteria

Phase 1 can be marked complete only after command output is preserved and reviewed.
