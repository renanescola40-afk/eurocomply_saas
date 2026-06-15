# Phase 4 Kickoff

Phase 4 starts after the Phase 3 repository-side closeout artifacts are in place.

## Scope

This kickoff is for planning and validation setup only.

It does not authorize product, email, document, or UI template changes.

## Entry checks

Before Phase 4 implementation work proceeds, run:

```bash
npm run phase3:strict
npm run phase3:closeout
```

## Phase 4 initial goals

- Define Phase 4 scope before code changes.
- Keep implementation work behind explicit checks.
- Preserve Phase 3 production readiness artifacts.
- Avoid committing local environment files or provider credentials.
- Keep templates unchanged unless a later Phase 4 scope document explicitly allows them.

## Initial artifacts

- `docs/PHASE4_KICKOFF.md`
- `scripts/dev/check-phase4-kickoff.mjs`
