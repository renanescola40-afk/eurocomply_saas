# Phase 4 Validation Commands

Use these commands to validate the repository-side Phase 4 planning foundation.

## Required sequence

```bash
npm run phase3:strict
npm run phase3:closeout
npm run phase4:check
npm run phase4:review
```

## What this validates

- Phase 3 repository-side gates remain available.
- Phase 4 planning checks are available through `phase4:check`.
- Phase 4 final review and next implementation plan are available through `phase4:review`.

## Boundary

These commands validate planning artifacts only. They do not prove runtime behavior or authorize product, email, document, or UI template changes.
