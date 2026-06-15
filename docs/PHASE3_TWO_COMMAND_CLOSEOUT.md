# Phase 3 Two Command Closeout

This guide reduces repository-side Phase 3 closeout to two commands.

## Scope

This guide is only for repository validation.

It does not authorize product, email, document, or UI template changes.

## Commands

```bash
npm run phase3:strict
node scripts/dev/run-phase3-closeout.mjs
```

## Meaning

If both commands pass, the repository evidence is ready for closeout review.

This does not mean production-complete.

Production-complete still requires external deployment gates and production owner acceptance.

## Failure rule

If either command fails, do not mark Phase 3 repository-complete.
