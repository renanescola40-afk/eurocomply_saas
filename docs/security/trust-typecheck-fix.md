# Trust page typecheck fix

Status: implemented in this PR.

## Issue

The localized Trust page referenced an undefined `copy` variable during render, which failed TypeScript validation.

## Fix

The page now binds the selected localized Trust content from the existing `TRUST_COPY` map before rendering.

## Validation

Expected validation commands:

```bash
npm run typecheck
npm run lint
```

No runtime evidence is marked complete by this fix.
