# Phase 3 Completion Gates

This document defines the final completion gates for Risck comply SaaS Phase 3.

## Scope

Phase 3 completion gates prove that production readiness work is documented, automated, and constrained to authorized files.

This document does not authorize product, email, document, or UI template changes.

## Required documentation gates

Phase 3 requires these documentation files:

- `docs/PHASE3_PRODUCTION_READINESS.md`
- `docs/PHASE3_DEPLOYMENT_RUNBOOK.md`
- `docs/PHASE3_DATABASE_MIGRATION_SAFETY.md`
- `docs/PHASE3_RUNTIME_SECURITY_OBSERVABILITY.md`
- `docs/PHASE3_AUTH_SESSION_READINESS.md`
- `docs/PHASE3_COMPLETION_GATES.md`

## Required automation gates

Phase 3 requires these automation files:

- `scripts/dev/check-phase3-script-files.mjs`
- `scripts/dev/check-phase3-production-readiness.mjs`
- `scripts/dev/check-phase3-runtime-readiness.mjs`
- `scripts/dev/check-phase3-auth-session-readiness.mjs`
- `scripts/dev/check-phase3-completion-gates.mjs`
- `scripts/dev/run-phase3-strict.mjs`

## Required strict runner gates

The strict runner must execute:

1. Phase 3 file inventory check.
2. Runtime security and observability readiness check.
3. Auth/session readiness check.
4. Production readiness check.
5. Completion gates check.

## Required generated report hygiene

Generated local reports must be ignored by Git:

- `phase3-production-readiness-report.json`
- `phase3-runtime-readiness-report.json`
- `phase3-auth-session-readiness-report.json`
- `phase3-completion-gates-report.json`

## Required external gates

These gates cannot be proven by repository files alone and must be confirmed in the deployment environment:

- Production secrets configured outside the repository.
- Deployment target configured with production environment variables.
- Supabase production migrations reviewed and applied in order.
- Stripe live products, prices, and webhook endpoint configured.
- Sentry production project configured when observability is enabled.
- Local or CI execution of `npm run phase3:strict` passes.

## Completion rule

Phase 3 may be marked complete only when repository gates pass and the external gates are confirmed.

Until the external gates are confirmed, Phase 3 is implementation-complete but not production-complete.
