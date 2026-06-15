# Phase 3 Production Readiness Checklist

Phase 3 starts after the CI/CD foundation is in place.

## Goal

Prepare the SaaS for a production deployment path with explicit environment, security, database, and observability gates.

## Required production readiness areas

Phase 3 validates that the project has a clear production path for:

- Environment variables and secrets.
- Database migration safety.
- Authentication and session security.
- Runtime security headers.
- Logging and observability.
- Error handling and operational diagnostics.
- Deployment checklist and rollback notes.

## Required files

The Phase 3 foundation expects these files:

- `docs/PHASE3_PRODUCTION_READINESS.md`
- `scripts/dev/check-phase3-production-readiness.mjs`
- `scripts/dev/check-phase3-script-files.mjs`
- `scripts/dev/run-phase3-strict.mjs`

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
