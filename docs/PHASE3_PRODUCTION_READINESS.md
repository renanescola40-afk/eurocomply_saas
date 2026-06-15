# Phase 3 Production Readiness Checklist

Phase 3 starts after the CI/CD foundation is in place.

## Goal

Prepare the SaaS for a production deployment path with explicit environment, security, database, and observability gates.

## Phase position

Phase 3 is the production readiness foundation inside the 13-phase EuroComply SaaS implementation sequence.

## Required production readiness areas

Phase 3 validates that the project has a clear production path for:

- Environment variables and secrets.
- Database migration safety.
- Authentication and session security.
- Runtime security headers.
- Logging and observability.
- Error handling and operational diagnostics.
- Deployment checklist and rollback notes.

## Authorized scope

Phase 3 work is authorized only in low-risk implementation control files:

- `docs/PHASE3_PRODUCTION_READINESS.md`
- `scripts/dev/check-phase3-production-readiness.mjs`
- `scripts/dev/check-phase3-script-files.mjs`
- `scripts/dev/run-phase3-strict.mjs`
- `package.json` npm aliases for Phase 3 validation
- `.env.example` documentation when a required production variable is missing

## Prohibited scope

Do not modify product, email, document, or UI templates during Phase 3 readiness work unless a later phase explicitly authorizes template changes.

Protected template paths include:

- `templates/`
- `app/templates/`
- `components/templates/`
- `emails/templates/`

Do not commit production secrets, local `.env` files, private keys, live Stripe keys, Supabase service credentials, Sentry auth tokens, or customer data.

## Implementation method

Phase 3 changes must be deterministic and verifiable:

1. Add or update checks before declaring readiness.
2. Keep generated reports outside product runtime paths.
3. Prefer scripts and docs over UI/template changes.
4. Validate required npm aliases before relying on them.
5. Keep deployment secrets outside the repository.
6. Run the strict Phase 3 runner before marking the phase complete.

## Required files

The Phase 3 foundation expects these files:

- `docs/PHASE3_PRODUCTION_READINESS.md`
- `scripts/dev/check-phase3-production-readiness.mjs`
- `scripts/dev/check-phase3-script-files.mjs`
- `scripts/dev/run-phase3-strict.mjs`

## Required package aliases

The Phase 3 foundation expects these npm aliases:

- `phase3:files`
- `phase3:check`
- `phase3:strict`

## Required local validation

Run:

```bash
node scripts/dev/run-phase3-strict.mjs
```

After aliases are ensured, run:

```bash
npm run phase3:strict
```

For only the production readiness check, run:

```bash
npm run phase3:check
```

## Completion criteria

Phase 3 foundation is complete when:

- Required Phase 3 files exist.
- Required package aliases exist.
- `.env.example` exists and documents required production environment variables.
- Production secrets are not committed.
- Database migration commands are documented.
- Deployment and rollback notes are documented.
- Production readiness check passes locally.
- CI is already available from Phase 2.

## Exit criteria

Phase 3 can be marked complete only after the production readiness runner passes locally and the real deployment target is configured with secrets outside the repository.
