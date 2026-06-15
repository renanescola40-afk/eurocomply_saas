# Phase 3 Index

This index maps the EuroComply SaaS Phase 3 repository artifacts.

## Scope

This index is for production readiness traceability only.

It does not authorize product, email, document, or UI template changes.

## Core documents

- `docs/PHASE3_PRODUCTION_READINESS.md`
- `docs/PHASE3_DEPLOYMENT_RUNBOOK.md`
- `docs/PHASE3_DATABASE_MIGRATION_SAFETY.md`
- `docs/PHASE3_RUNTIME_SECURITY_OBSERVABILITY.md`
- `docs/PHASE3_AUTH_SESSION_READINESS.md`
- `docs/PHASE3_COMPLETION_GATES.md`
- `docs/PHASE3_PROGRESS_STATUS.md`
- `docs/PHASE3_PRODUCTION_HANDOFF.md`
- `docs/PHASE3_SCOPE_LOCK.md`
- `docs/PHASE3_EXTERNAL_GATES_CHECKLIST.md`
- `docs/PHASE3_FINAL_VALIDATION_COMMANDS.md`
- `docs/PHASE3_CLOSEOUT_DECISION_RECORD.md`

## Addenda

- `docs/PHASE3_PROGRESS_ADDENDUM_EXTERNAL_GATES.md`
- `docs/PHASE3_RUNTIME_INTEGRATION_PATCH.md`

## Core checkers

- `scripts/dev/check-phase3-script-files.mjs`
- `scripts/dev/check-phase3-production-readiness.mjs`
- `scripts/dev/check-phase3-runtime-readiness.mjs`
- `scripts/dev/check-phase3-auth-session-readiness.mjs`
- `scripts/dev/check-phase3-completion-gates.mjs`
- `scripts/dev/check-phase3-progress-status.mjs`
- `scripts/dev/check-phase3-production-handoff.mjs`
- `scripts/dev/check-phase3-scope-lock.mjs`
- `scripts/dev/check-phase3-external-gates-checklist.mjs`
- `scripts/dev/check-phase3-final-validation-commands.mjs`
- `scripts/dev/check-phase3-closeout-decision.mjs`

## Runner

- `scripts/dev/run-phase3-strict.mjs`

## CI

- `.github/workflows/ci.yml`

## Final validation commands

```bash
npm run phase3:strict
node scripts/dev/check-phase3-progress-status.mjs
node scripts/dev/check-phase3-scope-lock.mjs
node scripts/dev/check-phase3-external-gates-checklist.mjs
node scripts/dev/check-phase3-final-validation-commands.mjs
node scripts/dev/check-phase3-closeout-decision.mjs
```

## Status boundary

Repository evidence can prove repository-complete or validated status.

Production-complete status requires external gates and production owner acceptance.
