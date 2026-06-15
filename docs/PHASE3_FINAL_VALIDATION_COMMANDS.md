# Phase 3 Final Validation Commands

This document lists the repository-side validation commands for EuroComply SaaS Phase 3.

## Scope

This document is only for readiness validation.

It does not authorize product, email, document, or UI template changes.

## Required commands

Run these commands before marking the repository side of Phase 3 complete:

```bash
npm run phase3:strict
node scripts/dev/check-phase3-progress-status.mjs
node scripts/dev/check-phase3-scope-lock.mjs
node scripts/dev/check-phase3-external-gates-checklist.mjs
```

## Optional focused checks

```bash
node scripts/dev/check-phase3-script-files.mjs
node scripts/dev/check-phase3-runtime-readiness.mjs
node scripts/dev/check-phase3-auth-session-readiness.mjs
node scripts/dev/check-phase3-production-readiness.mjs
node scripts/dev/check-phase3-completion-gates.mjs
node scripts/dev/check-phase3-production-handoff.mjs
```

## Result interpretation

- If any repository command fails, Phase 3 is not repository-complete.
- If repository commands pass but external gates are not confirmed, Phase 3 is validated but not production-complete.
- If repository commands pass and all external gates are confirmed, Phase 3 can be marked production-complete.
